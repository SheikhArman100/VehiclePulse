import { provisionTopics, inspectTopics, inspectConsumerGroups } from "./topicManager.js";
import { runConsumerScalingTest } from "./consumerScaling.js";
import { executeConsumerReplay } from "./consumerReplay.js";

const command = process.argv[2] || "list";
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

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

    case "scale-test": {
      const instances = Number(process.argv[3]) || 3;
      console.log(`==> Running consumer scaling test with ${instances} concurrent instances...`);
      const result = await runConsumerScalingTest({
        brokers,
        groupId: "scaling-lab-consumer-group",
        instances,
        durationMs: 3000,
      });
      console.log("==> Consumer Scaling Results:", JSON.stringify(result, null, 2));
      break;
    }

    case "replay": {
      console.log("==> Running controlled historical consumer replay...");
      const result = await executeConsumerReplay({
        brokers,
        replayGroupId: `historical-backfill-group-${Date.now()}`,
        resetMode: "earliest",
        maxMessages: 50,
      });
      console.log("==> Historical Replay Results:", JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(
        `Unknown command: ${command}. Use 'create', 'list', 'groups', 'scale-test [instances]', or 'replay'.`
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Kafka Admin Error:", err);
  process.exit(1);
});
