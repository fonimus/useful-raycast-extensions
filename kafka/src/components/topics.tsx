import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConfigEntries, ConfigResourceTypes, PartitionMetadata } from "kafkajs";
import { buildAdmin, getConfig, getEnvs } from "../utils";
import { useCachedState } from "@raycast/utils";

interface ConfigEntry {
  name: string;
  value: string;
}

enum Compacted {
  loading = "loading",
  unauthorized = "unauthorized",
  compacted = "compacted",
  not_compacted = "not_compacted",
}

interface TopicInfo {
  name: string;
  compacted: Compacted;
  config: ConfigEntry[];
  partitions?: number;
}

function getAccessories(topic: TopicInfo) {
  const result = [];
  switch (topic.compacted) {
    case Compacted.loading:
      result.push({ tag: { color: Color.Brown, value: topic.compacted } });
      break;
    case Compacted.unauthorized:
      result.push({ tag: { color: Color.Yellow, value: topic.compacted } });
      break;
    case Compacted.compacted:
      result.push({ tag: { color: Color.Green, value: topic.compacted } });
      break;
    case Compacted.not_compacted:
      result.push({ tag: { color: Color.Red, value: topic.compacted } });
      break;
  }
  return result;
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
      setTopics(topics.map((topic) => ({ name: topic, compacted: Compacted.loading, config: [] })));

      const metadata = new Map(
        (
          await admin.fetchTopicMetadata({
            topics: topics,
          })
        ).topics.map((topic) => [topic.name, topic.partitions.length])
      );
      setTopics(
        topics.map((topic) => ({
          name: topic,
          compacted: Compacted.loading,
          config: [],
          partitions: metadata.get(topic),
        }))
      );

      for (const topic of topics) {
        let compacted: Compacted;
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
                compacted = configEntry.configValue === "compact" ? Compacted.compacted : Compacted.not_compacted;
              }
              return entry;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
          compacted = Compacted.unauthorized;
        }

        setTopics((existingItems) => {
          return existingItems.map((value) => {
            const newValue = JSON.parse(JSON.stringify(value));
            if (newValue.name === topic) {
              newValue.compacted = compacted;
              newValue.config = config;
            }
            return newValue;
          });
        });
      }
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
          title={{ value: topic.name, tooltip: `${topic.name} - ${topic.partitions?.toString()} partitions` }}
          detail={
            <List.Item.Detail
              isLoading={isLoading}
              metadata={
                topic.config.length > 0 && (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Name"} text={topic.name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Partitions"} text={topic.partitions?.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Configurations"} />
                    {topic.config.map((entry) => (
                      <List.Item.Detail.Metadata.Label key={entry.name} title={entry.name} text={entry.value} />
                    ))}
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
          accessories={getAccessories(topic)}
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
