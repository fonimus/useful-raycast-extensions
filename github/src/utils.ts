import {getPreferenceValues} from "@raycast/api";
import {Octokit} from "octokit";
import {Repository} from "@octokit/webhooks-types";
import hdate from "human-date";

export interface RepoPreferences {
    url: string;
    token: string;
    repositories: string;
}

const preferences = getPreferenceValues<RepoPreferences>();
export const githubClient = new Octokit({auth: preferences.token});

export function repoFromPrefs(): Repository[] {
    return preferences.repositories.split(' ').sort().map((repo) => {
        const ownerAndName = repo.split('/')
        return {
            owner: {
                login: ownerAndName[0]
            },
            name: ownerAndName[1]
        } as Repository
    });
}

export function buildUrl(repo: string): string {
    return `${preferences.url.replace(/\/$/, '')}/${repo}`;
}

export function duration(date: string) {
    if (date === '') {
        return
    }
    return hdate.relativeTime(date);
}
