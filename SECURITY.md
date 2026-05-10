# Security Policy

## Reporting a Vulnerability

Please do not open public issues for vulnerabilities.

Report security concerns by contacting the maintainers privately through the repository owner profile or the security advisory workflow once the GitHub repository is public.

## Secrets

Jupyter Config Cells may parse dotenv files and model/API configuration. The runtime does not write dotenv values to `os.environ` unless the user explicitly passes `--apply`.

Do not commit real credentials, API keys, tokens, private keys, or production endpoint secrets.

