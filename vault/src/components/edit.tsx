import {Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation} from "@raycast/api";
import {useState} from "react";
import {callWrite, stringify} from "../utils";
import {VaultDisplay} from "./display";
import {copyToken} from "./actions";
import ActionStyle = Alert.ActionStyle;

export function VaultEdit(props: { path: string, currentSecret: object }) {
    const {push, pop} = useNavigation();

    const [isLoading, setIsLoading] = useState(false);
    const [newSecret, setNewSecret] = useState<string>(stringify(props.currentSecret));

    async function saveSecret(values: { newSecret: string; }) {
        setIsLoading(true)
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Saving secret",
        });

        try {
            const newSecret = JSON.parse(values.newSecret)

            if (await confirmAlert({
                title: "Are you sure you want to erase secret ?",
                message: "This will create new version for this path",
                primaryAction: {
                    title: "Erase",
                    style: ActionStyle.Destructive
                },
                icon: Icon.SaveDocument,
                dismissAction: {
                    title: "Cancel",
                    style: ActionStyle.Cancel
                }
            })) {

                const response = await callWrite(props.path, newSecret);

                toast.style = Toast.Style.Success;
                toast.message = "Secret saved (version " + response.version + "), reloading";

                // redirect to read saved secret after 1 sec
                setTimeout(() => push(<VaultDisplay path={props.path}/>), 1000)
            } else {
                toast.hide()
            }
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.message = 'Failed to save secret\nPath: ' + props.path + '\n' + String(error);
        } finally {
            setIsLoading(false);
        }
    }

    return <Form
        isLoading={isLoading}
        actions={
            <ActionPanel>
                <Action.SubmitForm title="Save new secret" onSubmit={saveSecret}
                                   icon={Icon.SaveDocument}
                                   shortcut={{modifiers: ["cmd"], key: "s"}}/>
                <Action title={"Go back"} icon={Icon.ArrowLeft} onAction={() => pop()}/>
                {copyToken()}
            </ActionPanel>
        }
    >
        <Form.TextArea
            id="newSecret"
            title="New secret"
            value={newSecret}
            onChange={setNewSecret}
        />
    </Form>
}
