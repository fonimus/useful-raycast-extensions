import {useState} from "react";
import {Label, PullRequest} from "@octokit/webhooks-types";
import {Action, ActionPanel, Icon, List} from "@raycast/api";
import {useCachedState} from "@raycast/utils";
import {duration, getOwner, githubClient, repoFromPrefs} from "../utils";

export function PullRequests(props: { repo?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [navigation, setNavigation] = useState(props.repo);
    const [pulls, setPulls] = useState<PullRequest[]>([]);

    const [showBot, setShowBot] = useCachedState<boolean>('show-bot', false);
    const [showBody, setShowBody] = useCachedState<boolean>('show-body', false);

    async function getDetails(state: string, page = 0) {
        setIsLoading(true)
        const filteredRepositories = repoFromPrefs()
            .filter(repo => !props.repo || repo.name === props.repo)
            .map(repo => repo.name);
        try {
            const promises = filteredRepositories.map(repo => githubClient.rest.pulls.list({
                owner: getOwner(),
                repo: repo,
                state: state as "open" | "closed" | "all",
                page: page,
                per_page: 50,
            }).then(value => value.data as PullRequest[]))
            const results = await Promise.all(promises);
            setPulls(results
                .flatMap(value => value)
                .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
            )
        } catch (e) {
            console.error("Unable to list pull requests for : " + filteredRepositories, e)
        } finally {
            setIsLoading(false)
        }
    }

    function getPulls() {
        return pulls.filter((pull) => pull.user.type !== 'Bot' || showBot)
    }

    function onChange(number: string | null) {
        if (!number) {
            return
        }
        for (const pull of pulls) {
            if (pull.number.toString() === number) {
                setNavigation(pull.head.repo.name)
            }
        }
    }

    return <List
        filtering={true}
        isShowingDetail={getPulls().length > 0}
        isLoading={isLoading}
        searchBarPlaceholder={"Search in pull requests"}
        navigationTitle={navigation}
        onSelectionChange={onChange}
        searchBarAccessory={
            <List.Dropdown tooltip="Filter pull requests" onChange={newValue => getDetails(newValue)}>
                <List.Dropdown.Section title="State">
                    <List.Dropdown.Item title="Open" value="open"/>
                    <List.Dropdown.Item title="Closed" value="closed"/>
                    <List.Dropdown.Item title="All" value="all"/>
                </List.Dropdown.Section>
            </List.Dropdown>
        }
    >
        <List.EmptyView
            title={`No pull requests found${showBot ? "" : " (bot are not shown)"}`}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="Navigation">
                        <Action.SubmitForm title={showBot ? "Hide bot PR" : "Show bot PR"}
                                           icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                                           shortcut={{modifiers: ["cmd"], key: "i"}}
                                           onSubmit={() => setShowBot((x) => !x)}/>
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
        {getPulls().map((pull) => (
            <List.Item id={`${pull.number}`}
                       key={pull.number}
                       title={pull.title}
                       accessories={[{text: `#${pull.number}`}]}
                       actions={
                           <ActionPanel>
                               <ActionPanel.Section title="Navigation">
                                   <Action.OpenInBrowser title="Open in browser"
                                                         shortcut={{modifiers: ["cmd"], key: "o"}}
                                                         url={pull.html_url}/>
                                   <Action.SubmitForm title={showBody ? "Hide body" : "Show body"}
                                                      icon={showBody ? Icon.EyeDisabled : Icon.Eye}
                                                      shortcut={{modifiers: ["cmd"], key: "b"}}
                                                      onSubmit={() => setShowBody((x) => !x)}/>
                                   <Action.SubmitForm title={showBot ? "Hide bot PR" : "Show bot PR"}
                                                      icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                                                      shortcut={{modifiers: ["cmd"], key: "i"}}
                                                      onSubmit={() => setShowBot((x) => !x)}/>
                               </ActionPanel.Section>
                           </ActionPanel>
                       }
                       detail={
                           <List.Item.Detail
                               markdown={showBody ? pull.body : undefined}
                               metadata={
                                   <List.Item.Detail.Metadata>
                                       <List.Item.Detail.Metadata.Label title="Repo" text={pull.head.repo.name}/>
                                       <List.Item.Detail.Metadata.Separator/>
                                       <List.Item.Detail.Metadata.Label title="Title" text={pull.title}/>
                                       <List.Item.Detail.Metadata.Label title="Branch" text={pull.head.ref}/>
                                       <List.Item.Detail.Metadata.TagList title="Number">
                                           <List.Item.Detail.Metadata.TagList.Item
                                               text={`${pull.number}`} color={"#35dfee"}/>
                                       </List.Item.Detail.Metadata.TagList>
                                       <List.Item.Detail.Metadata.Label title="State" text={pull.state}/>
                                       <List.Item.Detail.Metadata.Label title="Creator" text={pull.user.login}
                                                                        icon={pull.user.avatar_url}/>
                                       <List.Item.Detail.Metadata.Separator/>
                                       <List.Item.Detail.Metadata.TagList title="Labels">
                                           {pull.labels.map((label: Label) => (
                                               <List.Item.Detail.Metadata.TagList.Item
                                                   key={label.id}
                                                   text={`${label.name}`} color={`#${label.color}`}/>
                                           ))}
                                       </List.Item.Detail.Metadata.TagList>
                                       <List.Item.Detail.Metadata.Separator/>
                                       <List.Item.Detail.Metadata.Label title="Creation"
                                                                        text={duration(pull.created_at)}/>
                                       <List.Item.Detail.Metadata.Label title="Updated"
                                                                        text={duration(pull.updated_at)}/>
                                       {pull.merged_at &&
                                           <List.Item.Detail.Metadata.Label title="Merged"
                                                                            text={duration(pull.merged_at)}/>}
                                       {pull.closed_at &&
                                           <List.Item.Detail.Metadata.Label title="Closed"
                                                                            text={duration(pull.closed_at)}/>}
                                   </List.Item.Detail.Metadata>
                               }
                           />
                       }
            ></List.Item>
        ))}
    </List>
}
