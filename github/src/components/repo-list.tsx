import { useCallback, useEffect, useState } from "react";
import { Repository } from "@octokit/webhooks-types";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { githubClient, repoFromPrefs } from "../utils";
import { PullRequests } from "./pull-requests";

export function RepoList() {
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<Repository[]>(repoFromPrefs());

  const getRepositoryInfo = useCallback(async () => {
    console.info("Get repositories");
    setIsLoading(true);
    try {
      const promises = repoFromPrefs().map((repo) =>
        githubClient.rest.repos
          .get({
            owner: repo.owner.login,
            repo: repo.name,
          })
          .then((value) => value.data)
      );
      const results = await Promise.all(promises);
      setRepos(results as Repository[]);
    } catch (e) {
      console.error("Unable to get repositories info", e);
    }
  }, []);

  useEffect(() => {
    getRepositoryInfo().finally(() => setIsLoading(false));
  }, [getRepositoryInfo]);

  const getAccessories = useCallback((repo: Repository) => {
    const result = [];
    result.push({ text: repo.owner.login });
    if (repo.stargazers_count !== undefined) {
      result.push({
        icon: { source: Icon.Star, tintColor: Color.Yellow },
        text: `${repo.stargazers_count}`,
      });
    }
    return result;
  }, []);

  return (
    <List filtering={true} isLoading={isLoading} searchBarPlaceholder="Search in repositories">
      {repos.map((repo) => (
        <List.Item
          key={repo.name}
          title={repo.name}
          subtitle={repo.description || ""}
          icon={Icon.Link}
          accessories={getAccessories(repo)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Navigation">
                <Action.Push
                  title="List pull requests"
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={<PullRequests repo={repo.name} />}
                />
                <Action.OpenInBrowser
                  title="Open in browser"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  url={repo.html_url}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  title="Copy url"
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  content={repo.html_url}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
