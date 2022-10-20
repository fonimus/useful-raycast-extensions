import {useCallback, useState} from "react";
import {DeleteMode, VaultListEntry} from "../interfaces";
import {callDelete, callTree, getTechnicalPaths} from "../utils";
import {Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast} from "@raycast/api";
import {Configuration, CopyToken, OpenVault, Reload, Root} from "./actions";
import {VaultDisplay} from "./display";
import {usePromise} from "@raycast/utils";

export function VaultTree(props: { path: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showTechnical, setShowTechnical] = useState(false);
    const [keys, setKeys] = useState<VaultListEntry[]>([]);

    const {isLoading: isLoadingTree, revalidate} = usePromise(async () => {
        setKeys(await callTree(props.path));
    });

    const deleteInFolder = useCallback(async (path: string): Promise<number> => {
        const tree = await callTree(path);
        let deleted = 0;
        for (const entry of tree) {
            if (entry.folder) {
                const deletedInFolder = await deleteInFolder(entry.key)
                deleted = deleted + deletedInFolder;
            } else {
                console.info('Deleting entry...', entry.key)
                await callDelete(entry.key, DeleteMode.destroyAllVersions)
                deleted++;
            }
        }
        return deleted;
    }, []);

    const deleteRecursively = useCallback(async (path: string) => {
        console.info(path)
        setIsLoading(true)
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: 'Deleting secrets',
        });

        try {
            if (await confirmAlert({
                title: 'Are you sure you want to destroy all secret versions ?',
                message: 'All secret versions and metadata are permanently destroyed and cannot be read or recovered later.',
                primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive
                },
                icon: Icon.DeleteDocument,
                dismissAction: {
                    title: 'Cancel',
                    style: Alert.ActionStyle.Cancel
                }
            })) {
                const nbDeleted = await deleteInFolder(path)

                toast.style = Toast.Style.Success;
                toast.message = nbDeleted + ' secrets deleted';

                await revalidate()
            } else {
                await toast.hide()
            }
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.message = 'Failed to delete secret\nPath: ' + path + '\n' + String(error);
        } finally {
            setIsLoading(false);
        }
    }, [deleteInFolder, revalidate]);

    return <List
        filtering={true}
        isLoading={isLoading || isLoadingTree}
        navigationTitle={props.path}>

        <List.EmptyView actions={
            <ActionPanel><Configuration/></ActionPanel>
        }/>

        {keys.filter((entry) => getTechnicalPaths().indexOf(entry.label) === -1 || showTechnical).map((entry) => (
            <List.Item key={entry.key}
                       title={entry.label}
                       icon={entry.folder ? {source: Icon.Folder, tintColor: Color.Blue} : {
                           source: Icon.Document,
                           tintColor: Color.Green
                       }}
                       actions={
                           <ActionPanel>
                               <ActionPanel.Section title="Navigation">
                                   {!entry.folder && <Action.Push icon={Icon.ArrowDown} title="Retrieve secret"
                                                                  target={<VaultDisplay path={entry.key}
                                                                                        showGoToRoot/>}/>}
                                   {entry.folder && <Action.Push icon={Icon.ArrowDown} title="Go Down"
                                                                 target={<VaultTree path={entry.key}/>}/>}
                                   {props.path !== '/' && <Root/>}
                               </ActionPanel.Section>
                               <ActionPanel.Section title="Copy">{CopyToken()}</ActionPanel.Section>
                               <ActionPanel.Section title="Display">
                                   <Action icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
                                           title={showTechnical ? 'Hide technical' : 'Show technical'}
                                           shortcut={{modifiers: ["cmd"], key: "i"}}
                                           onAction={() => setShowTechnical(!showTechnical)}/>
                                   <OpenVault path={entry.key}/>
                               </ActionPanel.Section>
                               <ActionPanel.Section title="Delete">
                                   {entry.folder && <Action icon={Icon.Trash} title="Delete all secrets recursively"
                                                            onAction={() => deleteRecursively(entry.key)}/>}
                               </ActionPanel.Section>
                               <Configuration/>
                               <Reload revalidate={revalidate}/>
                           </ActionPanel>}
            ></List.Item>
        ))}
    </List>
}
