import {useCallback, useEffect, useState} from "react";
import {Label, PullRequest} from "@octokit/webhooks-types";
import {Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast} from "@raycast/api";
import {useCachedState} from "@raycast/utils";
import {duration, getOwner, githubClient, repoFromPrefs} from "../utils";

type PullRequestDisplay = PullRequest & {
    approvals: number
}

export function PullRequests(props: { repo?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [navigation, setNavigation] = useState(props.repo);
    const [pulls, setPulls] = useState<PullRequestDisplay[]>([]);
    const [withDetails, setWithDetails] = useCachedState<boolean>('with-details', false);
    const [showBot, setShowBot] = useCachedState<boolean>('show-bot', false);
    const [showBody, setShowBody] = useCachedState<boolean>('show-body', false);

    const getDetails = useCallback(async (state: string, page = 0) => {
        setIsLoading(true)
        const filteredRepositories = repoFromPrefs()
            .filter(repo => !props.repo || repo.name === props.repo)
            .map(repo => repo.name);
        try {
            const listPullsPromises = filteredRepositories.map(repo => githubClient.rest.pulls.list({
                owner: getOwner(),
                repo: repo,
                state: state as "open" | "closed" | "all",
                page: page,
                per_page: 20,
            }).then(value => value.data as PullRequestDisplay[]))
            const allPulls = (await Promise.all(listPullsPromises)).flatMap(value => value)
            setPulls(allPulls.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)))
        } catch (e) {
            console.error("Unable to list pull requests for : " + filteredRepositories, e)
        } finally {
            setIsLoading(false)
        }
    }, []);

    const computeApprovals = useCallback(async () => {
        if (!pulls.length) {
            return
        }
        const approvalPromises = []
        setIsLoading(true)
        for (const pull of pulls) {
            approvalPromises.push(githubClient.rest.pulls.listReviews({
                owner: getOwner(),
                repo: pull.head.repo.name,
                pull_number: pull.number
            }).then(value => {
                let approvals = 0
                for (const review of value.data) {
                    if (review.state === "APPROVED") {
                        approvals++;
                    }
                }
                pull.approvals = approvals
            }));
        }
        await Promise.all(approvalPromises).finally(() => setIsLoading(false));
        setPulls(pulls)
    }, [pulls]);

    useEffect(() => {
        computeApprovals()
    }, [pulls]);

    const getPulls = useCallback(() => {
        return pulls.filter((pull) => pull.user.type !== 'Bot' || showBot)
    }, [pulls, showBot]);

    const onChange = useCallback((number: string | null) => {
        if (!number) {
            return
        }
        for (const pull of pulls) {
            if (pull.number.toString() === number) {
                setNavigation(pull.head.repo.name)
            }
        }
    }, [pulls]);

    const getAccessories = useCallback((pull: PullRequestDisplay) => {
        const result = [];
        if (!withDetails) {
            for (const label of pull.labels) {
                result.push({text: label.name})
            }
            result.push({text: duration(pull.created_at)})
            if (pull.approvals) {
                result.push({icon: Icon.Check, text: '' + pull.approvals, tooltip: 'Approved'});
            }
        }
        result.push({text: `#${pull.number}`});
        return result;
    }, [withDetails, pulls]);

    const approve = useCallback(async (pull: PullRequestDisplay) => {
        setIsLoading(true)
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Approving #${pull.number}`,
        });

        try {
            if (await confirmAlert({
                title: `Do you really want to approve pull request #${pull.number} ?`,
                primaryAction: {
                    title: 'Approve',
                    style: Alert.ActionStyle.Default
                },
                icon: Icon.Check,
                dismissAction: {
                    title: 'Cancel',
                    style: Alert.ActionStyle.Cancel
                }
            })) {
                await githubClient.rest.pulls.createReview({
                    owner: getOwner(),
                    repo: pull.head.repo.name,
                    pull_number: pull.number,
                    event: 'APPROVE'
                }).then(value => value.data)

                toast.style = Toast.Style.Success;
                toast.message = `Approved with success`;
            } else {
                await toast.hide()
            }
        } catch (error) {
            console.error('Unable to approve #' + pull.number, error)
            toast.style = Toast.Style.Failure;
            toast.message = 'Failed to approve #' + pull.number + '\n' + String(error);
        } finally {
            setIsLoading(false);
        }
    }, [pulls]);

    return <List
        filtering={true}
        isShowingDetail={withDetails && getPulls().length > 0}
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
        }>
        <List.EmptyView
            title={`No pull requests found${showBot ? "" : " (bot are not shown)"}`}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="Navigation">
                        <Action title={showBot ? "Hide bot PR" : "Show bot PR"}
                                icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                                shortcut={{modifiers: ["cmd"], key: "i"}}
                                onAction={() => setShowBot((x) => !x)}/>
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
        {getPulls().map((pull) => (
            <List.Item id={`${pull.number}`}
                       key={pull.number}
                       title={pull.title}
                       keywords={[`${pull.number}`]}
                       accessories={getAccessories(pull)}
                       actions={
                           <ActionPanel>
                               <ActionPanel.Section title="Navigation">
                                   <Action.OpenInBrowser title="Open in browser"
                                                         shortcut={{modifiers: ["cmd"], key: "o"}}
                                                         url={pull.html_url}/>
                                   <Action icon={Icon.Check} title="Approve"
                                           onAction={() => approve(pull)}/>
                                   <Action title={withDetails ? "Hide details panel" : "Show details panel"}
                                           icon={withDetails ? Icon.EyeDisabled : Icon.Eye}
                                           shortcut={{modifiers: ["cmd"], key: "i"}}
                                           onAction={() => setWithDetails(!withDetails)}/>
                                   {withDetails && <Action
                                       title={showBody ? "Hide body" : "Show body"}
                                       icon={showBody ? Icon.EyeDisabled : Icon.Eye}
                                       shortcut={{modifiers: ["cmd"], key: "b"}}
                                       onAction={() => setShowBody(!showBody)}/>}
                                   <Action title={showBot ? "Hide bot PR" : "Show bot PR"}
                                           icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                                           shortcut={{modifiers: ["cmd"], key: "f"}}
                                           onAction={() => setShowBot(!showBot)}/>
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
                                       {pull.approvals !== undefined && <List.Item.Detail.Metadata.Separator/>}
                                       {pull.approvals !== undefined &&
                                           <List.Item.Detail.Metadata.Label title="Approvals"
                                                                            text={`${pull.approvals}`}/>}
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
            />
        ))}
    </List>
}
