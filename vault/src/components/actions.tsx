import { Action, ActionPanel, Icon } from "@raycast/api";
import { getUserToken, getVaultNamespace, getVaultUrl } from "../utils";
import { VaultNamespace } from "./namespace";
import { VaultTree } from "./tree";
import { VaultEntities } from "./entities";

export function Configuration() {
  return (
    <ActionPanel.Section title="Configuration">
      <Action.Push
        icon={Icon.Cog}
        title={"Change namespace"}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        target={<VaultNamespace />}
      />
      <Action.Push
        icon={Icon.PersonLines}
        title={"List entities"}
        shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
        target={<VaultEntities />}
      />
      <Action.Push
        icon={Icon.List}
        title={"List secrets"}
        shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
        target={<VaultTree path={"/"} />}
      />
    </ActionPanel.Section>
  );
}

export function Reload(props: { revalidate: () => Promise<void> }) {
  const { revalidate } = props;
  return (
    <ActionPanel.Section title="Reload">
      <Action
        icon={Icon.RotateClockwise}
        title={"Reload"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );
}

export function CopyToken() {
  return (
    <Action.CopyToClipboard
      icon={Icon.CopyClipboard}
      title="Copy token"
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      content={getUserToken()}
    />
  );
}

export function OpenVault(props: { path?: string }) {
  let path = "";
  if (props.path) {
    path += "/secret";
    if (props.path.endsWith("/")) {
      path += "/list";
    } else {
      path += "/show";
    }
    path += "/" + props.path;
  }
  return (
    <Action.OpenInBrowser
      icon={Icon.Globe}
      title="Open in vault UI"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      url={`${getVaultUrl()}/ui/vault/secrets${path}?namespace=${getVaultNamespace()}`}
    />
  );
}

export function Root() {
  return (
    <Action.Push
      icon={Icon.ArrowLeft}
      title="Go to root"
      shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
      target={<VaultTree path={"/"} />}
    />
  );
}
