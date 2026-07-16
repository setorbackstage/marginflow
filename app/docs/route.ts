import "server-only"

export function GET() {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <title>MarginFlow OS — API Reference</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/openapi.yaml"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
