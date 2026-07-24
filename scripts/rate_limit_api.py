import os
import re
from pathlib import Path

# Root directory of the project
root_path = Path("/home/flowver/flowver/marginflow")
api_dir = root_path / "app" / "api"

# Public routes that we might want to exclude from rate limiting? 
# According to the task, we want to rate limit all /api/ routes.
# We'll apply to all.

# Pattern to find the export statement for a method
# Example: export const GET = compose(withRequestContext, withErrorHandling)(handleGet)
pattern = re.compile(
    r'(export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*compose\()'  # group 1: up to the opening parenthesis of compose
    r'([^)]*)'  # group 2: the arguments inside compose (we will modify this)
    r'(\)\s*\(\s*handle\w+\s*\))'  # group 3: the closing parenthesis of compose and the opening of the handler call
)

# We'll also look for the import line for the http module
import_pattern = re.compile(r'(from\s+"@/server/lib/http")')

def process_file(file_path):
    print(f"Processing {file_path}")
    with open(file_path, 'r') as f:
        content = f.read()

    # Check if we already have the import for withRateLimit
    if 'withRateLimit' not in content:
        # We need to add the import. We'll look for the existing import from '@/server/lib/http'
        # and add withRateLimit to the destructuring.
        # Example: import { compose, withErrorHandling, withRequestContext } from "@/server/lib/http"
        # We want to change to: import { compose, withErrorHandling, withRequestContext, withRateLimit } from "@/server/lib/http"
        # We'll do a simple replacement: add ', withRateLimit' before the closing brace.
        # But note there might be multiple lines. We'll do a regex to find the import and modify it.
        import_re = re.compile(r'(import\s*\{[^}]*)(\s*from\s+"@/server/lib/http")')
        match = import_re.search(content)
        if match:
            # Insert ', withRateLimit' before the closing brace (which is before the 'from')
            # Actually, the pattern captures everything inside the braces until the 'from'
            # We'll just do a simple string replacement: add ', withRateLimit' before the closing brace.
            # We'll look for the line that has the import and modify it.
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if '@/server/lib/http' in line and '{' in line and '}' in line:
                    # We assume the import is on one line
                    # Insert ', withRateLimit' before the closing brace
                    new_line = line.replace('}', ', withRateLimit}')
                    lines[i] = new_line
                    break
            content = '\n'.join(lines)
        else:
            # If we didn't find the import, we'll add it after the other imports from @/server/lib
            # This is a fallback.
            pass

    # Now, we need to modify the export statements.
    # We'll use the pattern to find and replace.
    def replace_func(match):
        # group 1: 'export const METHOD = compose('
        # group 2: the method (GET, POST, etc.)
        # group 3: the current arguments inside compose
        # group 4: ')(handleMethod)'
        args = match.group(3).strip()
        # We want to insert 'withRateLimit()' after 'withRequestContext' and before 'withErrorHandling'
        # But we don't know the exact order. Let's assume the common order is:
        #   withRequestContext, withErrorHandling
        # We'll split by commas, trim, and then insert after the first one that is 'withRequestContext'
        # or if we don't find it, we'll just put it at the beginning.
        parts = [p.strip() for p in args.split(',') if p.strip()]
        new_parts = []
        found_request_context = False
        for part in parts:
            new_parts.append(part)
            if part == 'withRequestContext' and not found_request_context:
                new_parts.append('withRateLimit()')
                found_request_context = True
        # If we didn't find withRequestContext, we'll just add it at the beginning.
        if not found_request_context:
            new_parts = ['withRateLimit()'] + new_parts
        # Join back
        new_args = ', '.join(new_parts)
        return f"{match.group(1)}{new_args}{match.group(4)}"

    new_content = pattern.sub(replace_func, content)

    # If we made changes, write back
    if new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"  -> Updated {file_path}")
    else:
        print(f"  -> No changes made to {file_path}")

def main():
    for root, dirs, files in os.walk(api_dir):
        for file in files:
            if file.endswith('.ts') and file == 'route.ts':
                full_path = os.path.join(root, file)
                process_file(Path(full_path))

if __name__ == '__main__':
    main()