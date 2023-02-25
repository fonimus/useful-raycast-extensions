import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { setVaultNamespace } from "../utils";
import { VaultTree } from "./tree";
import { CopyToken, OpenVault } from "./actions";

export function VaultNamespace() {
  const { push } = useNavigation();

  function setNamespaceAndGoToTree(values: { namespace: string }) {
    setVaultNamespace(values.namespace);
    push(<VaultTree path={"/"} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Cog} title="Set namespace" onSubmit={setNamespaceAndGoToTree} />
          <CopyToken />
          <OpenVault />
        </ActionPanel>
      }
    >
      <Form.TextField id="namespace" title="Namespace" storeValue />
    </Form>
  );
}
