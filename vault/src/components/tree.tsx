import {useState} from "react";
import {VaultListEntry} from "../interfaces";
import {callTree, getTechnicalPaths} from "../utils";
import {Action, ActionPanel, Icon, List} from "@raycast/api";
import {configuration, copyToken, openVault, reload, root} from "./actions";
import {VaultDisplay} from "./display";
import {usePromise} from "@raycast/utils";

export function VaultTree(props: { path: string }) {
    const [showTechnical, setShowTechnical] = useState(false);
    const [keys, setKeys] = useState<VaultListEntry[]>([]);

    const {isLoading, revalidate} = usePromise(async () => {
        setKeys(await callTree(props.path));
    });

    return <List
        filtering={true}
        isLoading={isLoading}
        navigationTitle={props.path}
    >
        <List.EmptyView actions={<ActionPanel>{configuration()}</ActionPanel>}/>
        {keys.filter((entry) => getTechnicalPaths().indexOf(entry.label) === -1 || showTechnical).map((entry) => (
            <List.Item key={entry.key}
                       title={entry.label}
                       icon={entry.folder ? Icon.Folder : Icon.Document}
                       actions={
                           <ActionPanel>
                               <ActionPanel.Section title="Navigation">
                                   {!entry.folder && <Action.Push icon={Icon.ArrowDown} title="Retrieve secret"
                                                                  target={<VaultDisplay path={entry.key}
                                                                                        showGoToRoot/>}/>}
                                   {entry.folder && <Action.Push icon={Icon.ArrowDown} title="Go Down"
                                                                 target={<VaultTree path={entry.key}/>}/>}
                                   {props.path !== '/' && root()}
                               </ActionPanel.Section>
                               <ActionPanel.Section title="Copy">{copyToken()}</ActionPanel.Section>
                               <ActionPanel.Section title="Display">
                                   <Action icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
                                           title={showTechnical ? 'Hide technical' : 'Show technical'}
                                           shortcut={{modifiers: ["cmd"], key: "i"}}
                                           onAction={() => setShowTechnical(!showTechnical)}/>
                                   {openVault()}
                               </ActionPanel.Section>
                               {configuration()}
                               {reload(revalidate)}
                           </ActionPanel>
                       }
            ></List.Item>
        ))}
    </List>
}
