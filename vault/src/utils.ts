import NodeVault from "node-vault";
import {
    DeleteMode,
    VAULT_NAMESPACE_CACHE_KEY,
    VAULT_TOKEN_CACHE_KEY,
    VaultListEntry,
    VaultLoginResponse,
    VaultMetaDataResponse,
    VaultReadMetadataResponse,
    VaultReadResponse,
    VaultTokenCache,
    VaultVersion
} from "./interfaces";
import got from "got";
import {Cache, getPreferenceValues, open, showToast, Toast} from "@raycast/api";
import {homedir} from "os";
import fs from "fs";
import hdate from "human-date";

export interface VaultPreferences {
    url: string;
    ldap: string;
    password: string;
    technicalPaths: string;
}

const preferences = getPreferenceValues<VaultPreferences>();
const vaultUrl = preferences.url.replace(/\/$/, '');
const ldap = preferences.ldap;
const password = preferences.password;

const cache = new Cache();

export function stringify(value: object) {
    return JSON.stringify(value, undefined, 2);
}

export function duration(date: string) {
    if (date === '') {
        return
    }
    return hdate.relativeTime(date);
}

export function getVaultUrl(): string {
    return vaultUrl;
}

export function getVaultNamespace(): string | undefined {
    return cache.get(VAULT_NAMESPACE_CACHE_KEY);
}

export function setVaultNamespace(newNamespace: string) {
    cache.set(VAULT_NAMESPACE_CACHE_KEY, newNamespace);
    // remove cached token as namespace changes
    cache.remove(VAULT_TOKEN_CACHE_KEY);
}

export function getTechnicalPaths(): string[] {
    return preferences.technicalPaths ? preferences.technicalPaths.split(' ') : [];
}

export function getUserToken(): string {
    const tokenCache = parseTokenFromCache();
    return tokenCache ? tokenCache.token : '';
}

export function parseTokenFromCache(): VaultTokenCache | undefined {
    const tokenCacheString = cache.get(VAULT_TOKEN_CACHE_KEY);
    if (tokenCacheString) {
        return JSON.parse(tokenCacheString) as VaultTokenCache;
    }
}

export async function getVaultClient(): Promise<NodeVault.client> {
    console.info('Getting vault client')
    let tokenCache = parseTokenFromCache();

    // check cache expiration
    if (tokenCache) {
        if (Date.now() > tokenCache.expiration) {
            // token expired, removing from cache
            cache.remove(VAULT_TOKEN_CACHE_KEY);
            console.info('Token expired, removing from cache')
            tokenCache = undefined
        }
    }
    // get token if needed
    if (!tokenCache) {
        console.info('Login with ldap...')
        const body: VaultLoginResponse = await got.post(`${vaultUrl}/v1/auth/ldap/login/${ldap}`, {
            json: {"password": password},
            headers: {
                "Content-Type": "application/json",
                "X-Vault-Namespace": getVaultNamespace(),
            },
            responseType: "json"
        }).json();
        // set token cache
        tokenCache = {
            token: body.auth.client_token,
            expiration: Date.now() + (body.auth.lease_duration * 1000)
        };
        // and save it
        cache.set(VAULT_TOKEN_CACHE_KEY, JSON.stringify(tokenCache));
        console.info('Logged successfully, saving token in cache')
    }
    return NodeVault({
        apiVersion: 'v1',
        endpoint: vaultUrl,
        namespace: getVaultNamespace(),
        token: tokenCache.token
    });
}

export async function saveSecretToFile(secret: object, path: string) {
    const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving secret",
    });
    if (secret) {
        const filePath = `${homedir()}/Downloads/secret${path.replaceAll("/", "_")}.json`;
        fs.writeFile(filePath, stringify(secret), async (err) => {
            if (err) {
                toast.style = Toast.Style.Failure;
                toast.message = "Failed to save secret to " + filePath + "\n" + String(err);
            } else {
                toast.style = Toast.Style.Success;
                toast.message = "Secret saved to " + filePath;
                await open(filePath);
            }
        });
    } else {
        toast.style = Toast.Style.Failure;
        toast.message = "Nothing to save";
    }
}

export async function callTree(path: string): Promise<VaultListEntry[]> {
    console.info('Calling tree', path)
    const client = await getVaultClient();
    const response = await client.list('secret/metadata' + path, {});
    return response.data.keys.map((key: string) => {
        return {key: path + key, label: key, folder: key.endsWith('/')}
    });
}

export async function callRead(path: string): Promise<VaultReadResponse> {
    console.info('Calling read', path)
    const client = await getVaultClient();
    const response = await client.read('secret/data' + path, {});
    return response.data;
}

export async function callReadMetadata(path: string): Promise<VaultReadMetadataResponse> {
    console.info('Calling read metadata', path)
    const client = await getVaultClient();
    const response = await client.read('secret/metadata' + path, {});
    let currentVersion: VaultVersion | undefined
    const versions = Object.getOwnPropertyNames(response.data.versions).map((versionStr) => {
        const version = parseInt(versionStr, 10);
        const tmp = response.data.versions[version];
        const result: VaultVersion = {
            version: version,
            created_time: tmp.created_time,
            deletion_time: tmp.deletion_time,
            destroyed: tmp.destroyed,
            deleted: tmp.deletion_time !== ''
        };
        if (response.data.current_version === version) {
            currentVersion = result
        }
        return result
    }).sort((a, b) => b.version - a.version)
    if (!currentVersion) {
        throw new Error('Could not find current version in versions list')
    }
    return {
        current_version: currentVersion,
        versions: versions
    };
}

export async function callWrite(path: string, newSecret: object): Promise<VaultMetaDataResponse> {
    console.info('Calling write', path)
    const client = await getVaultClient();
    const response = await client.write('secret/data' + path, {data: newSecret}, {});
    return response.data;
}

export async function callDelete(path: string, deleteMode: DeleteMode, version?: number) {
    console.info('Calling delete', path, deleteMode)
    const client = await getVaultClient();
    if (deleteMode === DeleteMode.deleteVersion) {
        await client.delete('secret/data' + path, {});
    } else if (deleteMode === DeleteMode.destroyVersion) {
        if (!version) {
            throw new Error('Version is mandatory to destroy specific version')
        }
        await client.request({
            path: '/secret/destroy' + path,
            method: 'POST',
            json: {
                "versions": [version]
            }
        });
    } else if (deleteMode === DeleteMode.destroyAllVersions) {
        await client.delete('secret/metadata' + path, {});
    }
}

export async function callUndelete(path: string, version?: number) {
    console.info('Calling undelete', path)
    if (!version) {
        throw new Error('Version is mandatory to undelete specific version')
    }
    const client = await getVaultClient();
    await client.request({
        path: '/secret/undelete' + path,
        method: 'POST',
        json: {
            "versions": [version]
        }
    });
}
