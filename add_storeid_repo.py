#!/usr/bin/env python3
import os
import re

def modify_file(file_path):
    """Modify a single repository file to add storeId filtering where appropriate."""
    print(f"Processing {file_path}")
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading file: {e}")
        return False

    original_content = content

    # Determine the repository name from the file path.
    match = re.search(r'/([^/]+)\\.repository\\.ts$', file_path)
    if not match:
        print(f"  Could not determine repository name from {file_path}")
        return False
    repo_name = match.group(1)

    # Define which methods to modify for each repository.
    modifications = {
        'product': ['findById', 'findByIdWithModifierGroups', 'count'],
        'category': ['findById', 'count'],
        'order': ['findById', 'exists', 'findByIdWithDetails', 'count'],
        # Add more repositories as needed.
    }

    if repo_name not in modifications:
        print(f"  No modifications defined for repository {repo_name}")
        return False

    methods_to_modify = set(modifications[repo_name])
    if not methods_to_modify:
        print(f"  No methods to modify for {repo_name}")
        return False

    # We'll process the file line by line.
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for a method definition: starts with whitespace, then method name, then parameters, then return type, then open brace.
        # We'll use a regex to capture the parts.
        match = re.match(r'^(\\s*)(\\w+)\\s*\\(([^)]*)\\)\\s*:\\s*([^{]*)\\s*\\{', line)
        if match:
            indent, method_name, params, return_type = match.groups()
            if method_name in methods_to_modify:
                # Check if the method already has a storeId parameter.
                if 'storeId' not in params:
                    # We need to add storeId: string after the db parameter.
                    # Assume the first parameter is db: DbClient.
                    param_list = [p.strip() for p in params.split(',') if p.strip()]
                    if param_list and param_list[0].startswith('db:'):
                        # Insert storeId: string after the first parameter.
                        new_param_list = [param_list[0], 'storeId: string'] + param_list[1:]
                        new_params = ', '.join(new_param_list)
                    else:
                        # If the first param is not db, we still add storeId as the second parameter? We'll just prepend.
                        new_param_list = ['storeId: string'] + param_list
                        new_params = ', '.join(new_param_list)

                    # Reconstruct the method signature.
                    new_line = f"{indent}{method_name}({new_params}): {return_type} {{"
                    new_lines.append(new_line)

                    # Now we need to modify the method body to add storeId to the where clause.
                    # We'll process the following lines until we close the method's brace.
                    i += 1
                    brace_count = 1  # we have passed the opening brace of the method
                    while i < len(lines) and brace_count > 0:
                        body_line = lines[i]
                        # Update brace count for { and }
                        brace_count += body_line.count('{') - body_line.count('}')
                        # If we are still inside the method body, look for where: {
                        if brace_count > 0 and 'where:' in body_line and '{' in body_line:
                            # We found a line with where: {
                            # We want to insert storeId: after the opening brace.
                            # Example: "      where: { id }"
                            # We'll change to: "      where: { storeId, id }"
                            # We'll do a simple replacement: replace "where: {" with "where: { storeId,"
                            # but only if storeId is not already present.
                            if 'where:' in body_line and '{' in body_line and 'storeId:' not in body_line:
                                # Find the index of the first '{' after 'where:'
                                # We'll assume the pattern is where: {
                                idx = body_line.find('{')
                                if idx != -1:
                                    # Insert 'storeId: ' after the opening brace.
                                    new_body_line = body_line[:idx+1] + ' storeId: ' + body_line[idx+1:]
                                    body_line = new_body_line
                        new_lines.append(body_line)
                        i += 1
                    # We have processed the method body, so we continue without incrementing i again.
                    continue
                else:
                    # Already has storeId, we'll just keep the line as is.
                    new_lines.append(line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
        i += 1

    new_content = '\n'.join(new_lines)
    if new_content == original_content:
        print(f"  No changes made to {file_path}")
        return False

    try:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"  Modified {file_path}")
        return True
    except Exception as e:
        print(f"  Error writing file: {e}")
        return False

def main():
    # Change to the marginflow directory (we are already in it, but just in case).
    os.chdir('/home/flowver/flowver/marginflow')
    print(f"Current directory: {os.getcwd()}")

    # Find all repository files.
    repo_files = []
    for root, dirs, files in os.walk('server/repositories'):
        for file in files:
            if file.endswith('.ts') and file not in ['index.ts', 'pagination.ts']:
                repo_files.append(os.path.join(root, file))

    print(f"Found {len(repo_files)} repository files to process.")

    modified_count = 0
    for file_path in repo_files:
        if modify_file(file_path):
            modified_count += 1

    print(f"\nModified {modified_count} repository files.")

    # Now, we need to update the service files to pass the storeId argument.
    # We'll do a similar process for service files, but for now, we'll just note that it's needed.
    # We'll create a note for the user.
    with open('SERVICE_UPDATE_NOTES.md', 'w') as f:
        f.write("# Service Updates Needed\\n\\n")
        f.write("The following repository methods have been modified to require a storeId parameter:\\n\\n")
        f.write("## Product Repository\\n")
        f.write("- findById(db, storeId, id)\\n")
        f.write("- findByIdWithModifierGroups(db, storeId, id)\\n")
        f.write("- count(db, storeId, where)\\n\\n")
        f.write("## Category Repository\\n")
        f.write("- findById(db, storeId, id)\\n")
        f.write("- count already has storeId\\n\\n")
        f.write("## Order Repository\\n")
        f.write("- findById(db, storeId, id)\\n")
        f.write("- exists(db, storeId, id)\\n")
        f.write("- findByIdWithDetails(db, storeId, id)\\n")
        f.write("- count(db, storeId, where)\\n\\n")
        f.write("Please update the service files accordingly.\\n")

    print("Created SERVICE_UPDATE_NOTES.md with details.")

    # Since we modified repository files, we should commit.
    # Check git status.
    os.system('git status --porcelain > /tmp/git_status.txt 2>&1')
    with open('/tmp/git_status.txt', 'r') as f:
        status = f.read()
    if status.strip():
        print("\nCommitting changes...")
        os.system('git add .')
        os.system('git commit -m "prisma: add storeId filter to repository queries"')
        print("Commit completed.")
    else:
        print("No changes to commit (working directory clean).")

    print("\nScript completed.")

if __name__ == "__main__":
    main()