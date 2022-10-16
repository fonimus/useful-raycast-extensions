import {useEffect, useState} from "react";
import {Repository} from "@octokit/webhooks-types";
import {Action, ActionPanel, Icon, List} from "@raycast/api";
import {buildUrl, getOwner, githubClient, repoFromPrefs} from "../utils";
import {PullRequests} from "./pull-requests";

export function RepoList() {
    const [isLoading, setIsLoading] = useState(false);
    const [repos, setRepos] = useState<Repository[]>(repoFromPrefs());

    async function getInfo() {
        setIsLoading(true)
        try {
            const promises = repos.map(repo => githubClient.rest.repos.get({
                owner: getOwner(),
                repo: repo.name,
            }).then(value => value.data))
            const results = await Promise.all(promises);
            setRepos(results as Repository[])
        } catch (e) {
            console.error("Unable to get repositories info", e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        getInfo();
    }, []);

    return <List
        filtering={true}
        isLoading={isLoading}
        searchBarPlaceholder="Search in repositories"
    >
        {repos.map((repo) => (
            <List.Item key={repo.name}
                       title={repo.name}
                       subtitle={repo.description || ''}
                       icon={Icon.Link}
                       accessories={repo.stargazers_count !== undefined ? [{
                           icon: Icon.Star,
                           text: `${repo.stargazers_count}`
                       }] : []}
                       actions={
                           <ActionPanel>
                               <ActionPanel.Section title="Navigation">
                                   <Action.Push title="List pull requests" icon={Icon.List}
                                                shortcut={{modifiers: ["cmd"], key: "d"}}
                                                target={<PullRequests repo={repo.name}/>}/>
                                   <Action.OpenInBrowser title="Open in browser"
                                                         shortcut={{modifiers: ["cmd"], key: "o"}}
                                                         url={buildUrl(repo.name)}/>
                               </ActionPanel.Section>
                               <ActionPanel.Section title="Copy">
                                   <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy url"
                                                           shortcut={{modifiers: ["cmd", "opt"], key: "c"}}
                                                           content={buildUrl(repo.name)}/>
                               </ActionPanel.Section>
                           </ActionPanel>
                       }
            ></List.Item>
        ))}
    </List>;
}
