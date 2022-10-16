import {Action, ActionPanel, Icon} from "@raycast/api";
import {getUserToken, getVaultNamespace, getVaultUrl} from "../utils";
import {VaultNamespace} from "./namespace";
import {VaultTree} from "./tree";

export function configuration() {
    return <ActionPanel.Section title="Configuration">
        <Action.Push icon={Icon.Cog} title={"Change namespace"}
                     shortcut={{modifiers: ["cmd"], key: "y"}}
                     target={<VaultNamespace/>}/>
    </ActionPanel.Section>
}

export function copyToken() {
    return <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy token"
                                   shortcut={{modifiers: ["cmd"], key: "t"}}
                                   content={getUserToken()}/>
}

export function openVault(path = '') {
    return <Action.OpenInBrowser title="Open vault UI"
                                 shortcut={{modifiers: ["cmd"], key: "o"}}
                                 url={`${getVaultUrl()}/ui/vault/secrets${path}?namespace=${getVaultNamespace()}`}/>
}

export function root() {
    return <Action.Push icon={Icon.ArrowLeft} title="Go to root"
                        shortcut={{modifiers: ["cmd"], key: "r"}}
                        target={<VaultTree path={'/'}/>}/>
}
