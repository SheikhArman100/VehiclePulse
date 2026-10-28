import { provisionTopics, inspectTopics, inspectConsumerGroups } from "./topicManager.js";

const command = process.argv[2] || "list";

async function main() {
  switch (command) {
    case "create": {
      console.log("==> Provisioning canonical VehiclePulse Kafka topics...");
      const result = await provisionTopics();
      console.log(`Created (${result.created.length}):`, result.created);
      console.log(`Already Existed (${result.alreadyExisted.length}):`, result.alreadyExisted);
      break;
    }

    case "list": {
      console.log("==> Inspecting topics on cluster...");
      const topics = await inspectTopics();
      console.log(
        topics.map((t) => ({
          name: t.name,
          partitionsCount: t.partitions.length,
          partitions: t.partitions.map((p) => ({
            id: p.partitionId,
            leader: p.leader,
            replicas: p.replicas,
            isr: p.isr,
          })),
        }))
      );
      break;
    }

    case "groups": {
      console.log("==> Listing Kafka consumer groups...");
      const groups = await inspectConsumerGroups();
      console.log(groups);
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Use 'create', 'list', or 'groups'.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Kafka Admin Error:", err);
  process.exit(1);
});
