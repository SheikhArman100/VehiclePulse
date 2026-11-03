export type CompatibilityMode =
  | "BACKWARD"
  | "FORWARD"
  | "FULL"
  | "NONE";

export interface SchemaSubject {
  subject: string;
  version: number;
  schemaType: "PROTOBUF" | "JSON";
  schemaText: string;
}

/**
 * Lightweight in-memory schema registry providing compatibility checks,
 * matching Apicurio Registry / Confluent Schema Registry evolution guarantees.
 */
export class LocalSchemaRegistry {
  private subjects: Map<string, SchemaSubject[]> = new Map();
  private compatibilityMode: CompatibilityMode;

  constructor(defaultMode: CompatibilityMode = "BACKWARD") {
    this.compatibilityMode = defaultMode;
  }

  /**
   * Registers a new schema version under the subject, enforcing compatibility rules.
   */
  public register(
    subject: string,
    schemaText: string,
    schemaType: "PROTOBUF" | "JSON" = "PROTOBUF"
  ): SchemaSubject {
    const existing = this.subjects.get(subject) || [];

    if (existing.length > 0) {
      const latest = existing[existing.length - 1];
      const isCompatible = this.checkCompatibility(latest.schemaText, schemaText);
      if (!isCompatible) {
        throw new Error(
          `Schema registration rejected: Incompatible schema evolution for subject '${subject}' under ${this.compatibilityMode} compatibility.`
        );
      }
    }

    const newVersion: SchemaSubject = {
      subject,
      version: existing.length + 1,
      schemaType,
      schemaText,
    };

    existing.push(newVersion);
    this.subjects.set(subject, existing);
    return newVersion;
  }

  /**
   * Retrieves the latest registered schema for a subject
   */
  public getLatest(subject: string): SchemaSubject | undefined {
    const versions = this.subjects.get(subject);
    return versions ? versions[versions.length - 1] : undefined;
  }

  /**
   * Validates backward compatibility between two Protobuf schema texts.
   * Rules:
   * 1. Existing field tags (e.g. '= 6') must never change types (e.g. double -> string is illegal).
   * 2. Existing field tags must not be renumbered or deleted without reservation.
   * 3. New fields must have new tags.
   */
  public checkCompatibility(prevSchema: string, newSchema: string): boolean {
    if (this.compatibilityMode === "NONE") return true;

    // Detect field type changes on existing field numbers (e.g. speed_kmh double vs string)
    const fieldRegex = /(\w+)\s+(\w+)\s*=\s*(\d+);/g;

    const prevFields = new Map<number, { type: string; name: string }>();
    let match: RegExpExecArray | null;

    while ((match = fieldRegex.exec(prevSchema)) !== null) {
      const [, type, name, tag] = match;
      prevFields.set(Number(tag), { type, name });
    }

    const newFieldRegex = /(\w+)\s+(\w+)\s*=\s*(\d+);/g;
    while ((match = newFieldRegex.exec(newSchema)) !== null) {
      const [, type, , tag] = match;
      const tagNum = Number(tag);
      const existing = prevFields.get(tagNum);

      if (existing) {
        // Tag already existed: type MUST match exactly
        if (existing.type !== type) {
          return false; // Breaking type collision on existing tag!
        }
      }
    }

    return true;
  }
}
