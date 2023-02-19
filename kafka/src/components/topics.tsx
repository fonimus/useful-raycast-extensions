import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConfigEntries, ConfigResourceTypes } from "kafkajs";
import { buildAdmin, getConfig, getEnvs } from "../utils";
import { useCachedState } from "@raycast/utils";

interface ConfigEntry {
  name: string;
  value: string;
}

interface TopicInfo {
  name: string;
  compacted?: boolean;
  config: ConfigEntry[];
}

export default function KafkaTopics() {
  const [isLoading, setIsLoading] = useState(false);
  const [withDetails, setWithDetails] = useState(false);
  const [env, setEnv] = useCachedState("env", getEnvs()[0]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);

  const load = useCallback(async (env: string) => {
    console.info("Get kafka topics for env:", env);
    setIsLoading(true);
    try {
      const admin = await buildAdmin(env);
      const filterTopics = getConfig(env).filterTopics;
      const topics = (await admin.listTopics())
        .filter((topic) => {
          if (!filterTopics) {
            return true;
          }
          return filterTopics.some((filterTopic) => topic.includes(filterTopic));
        })
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
      setTopics(topics.map((topic) => ({ name: topic, config: [] })));

      const topicInfos: TopicInfo[] = [];
      for (const topic of topics) {
        let compacted;
        let config: ConfigEntry[] = [];

        try {
          const kafkaConfig = await admin.describeConfigs({
            resources: [{ type: ConfigResourceTypes.TOPIC, name: topic }],
            includeSynonyms: false,
          });

          config = kafkaConfig.resources[0].configEntries
            .map((configEntry: ConfigEntries) => {
              const entry = {
                name: configEntry.configName,
                value: configEntry.configValue,
              };
              if (configEntry.configName === "cleanup.policy") {
                compacted = configEntry.configValue === "compact";
              }
              return entry;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
          // not authorized
        }

        topicInfos.push({
          name: topic,
          compacted,
          config,
        });
      }
      setTopics(topicInfos);
    } catch (e) {
      console.error("Unable to get kafka topics", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(env).finally(() => console.debug("Init done"));
  }, [env, load]);

  return (
    <List
      filtering={true}
      isShowingDetail={withDetails}
      isLoading={isLoading}
      navigationTitle={topics.length + " topics"}
      searchBarAccessory={
        <List.Dropdown tooltip="Change environment" value={env} onChange={(newValue) => setEnv(newValue)}>
          <List.Dropdown.Section title="Environment">
            {getEnvs().map((env) => (
              <List.Dropdown.Item key={env} title={env} value={env} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {topics.map((topic) => (
        <List.Item
          key={topic.name}
          title={{ value: topic.name, tooltip: topic.name }}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              metadata={
                topic.config.length > 0 && (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Name"} text={topic.name} />
                    <List.Item.Detail.Metadata.Separator />
                    {topic.config.map((entry) => (
                      <List.Item.Detail.Metadata.Label key={entry.name} title={entry.name} text={entry.value} />
                    ))}
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
          accessories={
            topic.compacted !== undefined
              ? topic.compacted
                ? [
                    {
                      tag: { color: Color.Green, value: "compacted" },
                    },
                  ]
                : [
                    {
                      tag: { color: Color.Red, value: "not compacted" },
                    },
                  ]
              : [
                  {
                    tag: { color: Color.Yellow, value: "unknown" },
                  },
                ]
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={topic.name} />
              <Action
                title="Refresh"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.RotateClockwise}
                onAction={async () => await load(env)}
              />
              <Action
                icon={Icon.Info}
                title="Display details"
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => setWithDetails((withDetails) => !withDetails)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
