# Vault extension

> Extension to work with [vault](https://www.vaultproject.io/) secrets

## Configuration

| Name           | Required | Description                                  |
|----------------|----------|----------------------------------------------|
| url            | Yes      | -                                            |
| ldap           | Yes      | -                                            |
| password       | Yes      | -                                            |
| technicalPaths | No       | Used to hide technical paths in results list |

## Vault command

- Login with ldap/password and auto-renewal of token
- List secrets keys and search
- Display secret
  - with/without details
  - list / json mode
  - copy secret value(s)
  - save to file
- Create new secret version
- Delete/undelete/destroy secret
- Open link in UI
- Copy token
- Change namespace
