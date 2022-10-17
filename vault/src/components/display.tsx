import {
    Action,
    ActionPanel,
    Alert,
    confirmAlert,
    Detail,
    Icon,
    List,
    showToast,
    Toast,
    useNavigation
} from "@raycast/api";
import {useCachedState, usePromise} from "@raycast/utils";
import {useState} from "react";
import {DeleteMode, DisplayMode, VaultEntry, VaultReadMetadataResponse,} from "../interfaces";
import {
    callDelete,
    callRead,
    callReadMetadata,
    callUndelete,
    duration,
    getVaultNamespace,
    getVaultUrl,
    saveSecretToFile,
    stringify
} from "../utils";
import {VaultEdit} from "./edit";
import {configuration, copyToken, openVault, reload, root} from "./actions";
import ActionStyle = Alert.ActionStyle;

export function VaultDisplay(props: { path: string, showGoToRoot?: boolean }) {
    const {push, pop} = useNavigation();

    const [isLoading, setIsLoading] = useState(false);
    const [secret, setSecret] = useState<object>({});
    const [secretList, setSecretList] = useState<VaultEntry[]>([]);
    const [result, setResult] = useState<string | undefined>(undefined);
    const [metadata, setMetadata] = useState<VaultReadMetadataResponse | undefined>();

    const [withDetails, setWithDetails] = useCachedState<boolean>('with-details', true);
    const [displayMode, setDisplayMode] = useCachedState<DisplayMode>('display-mode', DisplayMode.list);

    const {isLoading: loadingGetSecret, revalidate} = usePromise(
        async () => {
            const metadataResponse = await callReadMetadata(props.path);
            setMetadata(metadataResponse)
            if (metadataResponse.current_version.destroyed || metadataResponse.current_version.deletion_time !== '') {
                setWithDetails(true)
                setDisplayMode(DisplayMode.json)
                if (metadataResponse.current_version.destroyed) {
                    setResult('Version has been destroyed')
                } else {
                    setResult('Version has been deleted')
                }
            } else {
                const response = await callRead(props.path);
                const secret = response.data;

                setSecret(secret);
                setSecretList(Object.getOwnPropertyNames(secret).map(key => {
                    return {key: key, value: secret[key]};
                }));
                setResult("````json\n" + stringify(secret) + "\n````");
            }
        }
    );

    async function undeleteSecret() {
        setIsLoading(true)
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: 'Restoring secret',
        });

        try {
            await callUndelete(props.path, metadata?.current_version.version);

            toast.style = Toast.Style.Success;
            toast.message = 'Secret restored';

            // redirect to last view after 1 sec
            push(<VaultDisplay path={props.path}/>)
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.message = 'Failed to restore secret\nPath: ' + props.path + '\n' + String(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function deleteSecret(deleteMode: DeleteMode) {
        setIsLoading(true)
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: 'Deleting secret',
        });

        try {
            let title = ''
            let message = ''
            switch (deleteMode) {
                case DeleteMode.deleteVersion:
                    title = 'Are you sure you want to delete secret version ?'
                    message = 'This deletes current version of the secret. It can be un-deleted later.'
                    break;
                case DeleteMode.destroyVersion:
                    title = 'Are you sure you want to destroy secret version ?'
                    message = 'Current version is permanently destroyed and cannot be read or recovered later.'
                    break;
                case DeleteMode.destroyAllVersions:
                    title = 'Are you sure you want to destroy all secret versions ?'
                    message = 'All secret versions and metadata are permanently destroyed and cannot be read or recovered later.'
                    break;
            }
            if (await confirmAlert({
                title: title,
                message: message,
                primaryAction: {
                    title: "Delete",
                    style: ActionStyle.Destructive
                },
                icon: Icon.DeleteDocument,
                dismissAction: {
                    title: 'Cancel',
                    style: ActionStyle.Cancel
                }
            })) {
                await callDelete(props.path, deleteMode, metadata?.current_version.version);

                toast.style = Toast.Style.Success;
                toast.message = 'Secret deleted';

                // redirect to last view after 1 sec
                pop()
            } else {
                toast.hide()
            }
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.message = 'Failed to delete secret\nPath: ' + props.path + '\n' + String(error);
        } finally {
            setIsLoading(false);
        }
    }

    function generateActions(entry?: VaultEntry) {
        return <ActionPanel>
            <ActionPanel.Section title="Copy">
                {entry && <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy secret value"
                                                  content={entry.value}/>}
                <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy secret"
                                        content={stringify(secret)}/>
                <Action icon={Icon.SaveDocument} title="Save secret to file"
                        shortcut={{modifiers: ["cmd"], key: "s"}}
                        onAction={() => saveSecretToFile(secret, props.path)}/>
                {copyToken()}
            </ActionPanel.Section>
            {props.showGoToRoot && <ActionPanel.Section title="Navigation">{root()}</ActionPanel.Section>}
            <ActionPanel.Section title="Edit">
                <Action.Push icon={Icon.NewDocument} title="Create new version"
                             shortcut={{modifiers: ["cmd"], key: "n"}}
                             target={<VaultEdit path={props.path} currentSecret={secret}/>}/>
            </ActionPanel.Section>
            <ActionPanel.Section title="Delete">
                {!metadata?.current_version.destroyed &&
                    <Action icon={Icon.Trash}
                            title={metadata?.current_version.deleted ? "Undelete version" : "Delete version"}
                            shortcut={{modifiers: ["ctrl"], key: "x"}}
                            onAction={() => metadata?.current_version.deleted ? undeleteSecret() : deleteSecret(DeleteMode.deleteVersion)}/>}
                {!metadata?.current_version.destroyed &&
                    <Action icon={Icon.Trash} title="Destroy version"
                            shortcut={{modifiers: ["ctrl", "opt"], key: "x"}}
                            onAction={() => deleteSecret(DeleteMode.destroyVersion)}/>}
                <Action icon={Icon.Trash} title="Destroy all versions"
                        onAction={() => deleteSecret(DeleteMode.destroyAllVersions)}/>
            </ActionPanel.Section>
            <ActionPanel.Section title="Display">
                {!metadata?.current_version.destroyed && metadata?.current_version.deletion_time === '' &&
                    <Action icon={Icon.AppWindowList} title={"Display result as " + (entry ? 'json' : 'list')}
                            shortcut={{modifiers: ["cmd"], key: "d"}}
                            onAction={() => setDisplayMode((displayMode) => displayMode === DisplayMode.json ? DisplayMode.list : DisplayMode.json)}/>}
                <Action icon={Icon.Info} title="Display details"
                        shortcut={{modifiers: ["cmd"], key: "i"}}
                        onAction={() => setWithDetails((x) => !x)}/>
                <Action.OpenInBrowser title="Open in vault"
                                      shortcut={{modifiers: ["cmd"], key: "o"}}
                                      url={`${getVaultUrl()}/ui/vault/secrets/secret/show/${props.path}?namespace=${getVaultNamespace()}`}/>
                {openVault(`/secret/show/${props.path}`)}
            </ActionPanel.Section>
            {configuration()}
            {reload(revalidate)}
        </ActionPanel>
    }

    function loading(): boolean {
        return isLoading || loadingGetSecret
    }

    return displayMode === DisplayMode.json ?
        <Detail isLoading={loading()}
                markdown={result}
                navigationTitle={metadata && props.path + " (v" + metadata.current_version.version + ")"}
                actions={generateActions()}
                metadata={metadata && withDetails &&
                    <Detail.Metadata>
                        <Detail.Metadata.Label title="Namespace" text={getVaultNamespace()}/>
                        <Detail.Metadata.Label title="Path" text={props.path}/>
                        <Detail.Metadata.TagList title="Version">
                            <Detail.Metadata.TagList.Item text={"" + metadata.current_version.version}
                                                          color={"#35dfee"}/>
                        </Detail.Metadata.TagList>
                        <Detail.Metadata.Label title="Creation" text={duration(metadata.current_version.created_time)}/>
                        {metadata.current_version.deletion_time !== '' &&
                            <Detail.Metadata.Label title="Deletion"
                                                   text={duration(metadata.current_version.deletion_time)}/>}
                        <Detail.Metadata.Label title="Destroyed" text={"" + metadata.current_version.destroyed}/>
                        <Detail.Metadata.Separator/>
                        {metadata.versions.map((version) => (
                            <Detail.Metadata.Label key={version.version} title={"Version " + version.version}
                                                   text={"created " + duration(version.created_time)}
                                                   icon={version.destroyed ? Icon.XMarkCircleFilled :
                                                       version.deletion_time !== '' ? Icon.XMarkCircle : Icon.Check}/>
                        ))}
                    </Detail.Metadata>
                }
        />
        :
        <List
            isLoading={loading()}
            isShowingDetail={withDetails}
            filtering={true}
            navigationTitle={metadata && props.path + " (v" + metadata.current_version.version + ")"}
            searchBarPlaceholder="Search in secret"
        >
            <List.Section title={"Secret keys (" + secretList.length + ")"}>
                {secretList.map((entry) => (<List.Item
                        key={entry.key}
                        title={entry.key}
                        keywords={[entry.value]}
                        accessories={[{text: entry.value}]}
                        actions={generateActions(entry)}
                        detail={<List.Item.Detail
                            metadata={metadata &&
                                <List.Item.Detail.Metadata>
                                    <List.Item.Detail.Metadata.Label title="Key" text={entry.key}/>
                                    <List.Item.Detail.Metadata.Label title="Value" text={entry.value}/>
                                    <List.Item.Detail.Metadata.Separator/>
                                    <List.Item.Detail.Metadata.Label title="Namespace" text={getVaultNamespace()}/>
                                    <List.Item.Detail.Metadata.Label title="Path" text={props.path}/>
                                    <List.Item.Detail.Metadata.TagList title="Version">
                                        <List.Item.Detail.Metadata.TagList.Item
                                            text={"" + metadata.current_version.version} color={"#35dfee"}/>
                                    </List.Item.Detail.Metadata.TagList>
                                    <List.Item.Detail.Metadata.Label
                                        title="Creation" text={duration(metadata.current_version.created_time)}/>
                                    <List.Item.Detail.Metadata.Separator/>
                                    {metadata.versions.map((version) => (
                                        <List.Item.Detail.Metadata.Label key={version.version}
                                                                         title={"Version " + version.version}
                                                                         text={"created " + duration(version.created_time)}
                                                                         icon={version.destroyed ? Icon.XMarkCircleFilled :
                                                                             version.deletion_time !== '' ? Icon.XMarkCircle : Icon.Check}/>
                                    ))}
                                </List.Item.Detail.Metadata>
                            }
                        />
                        }
                    />
                ))}
            </List.Section>
        </List>
}
