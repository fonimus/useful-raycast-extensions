# Repo extension

> Extension to quickly consult team repositories and pull requests and open them

## Configuration

| Name         | Required | Description                                                                         |
|--------------|----------|-------------------------------------------------------------------------------------|
| url          | Yes      | Github url, default is https://github.com/                                          |
| organization | Yes      | Github organization, or owner                                                       |
| token        | Yes      | Github token, generate new one at https://github.com/settings/tokens                |
| repositories | Yes      | Display info and pull requests only for those repositories (names separated by coma |

Note: to use with organization, don't forget to configure SSO for the token.

## Repo command

- Search in repository list and open them
- List repository pull requests with some details and open them

## Pull command

- List pull requests with some filters and with some details and open them
