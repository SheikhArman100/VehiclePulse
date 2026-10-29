-- CreateTable
CREATE TABLE `alert_rules` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(255) NULL,
    `conditionType` VARCHAR(64) NOT NULL,
    `thresholdValue` DOUBLE NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `cooldownSecs` INTEGER NOT NULL DEFAULT 300,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerts` (
    `id` VARCHAR(64) NOT NULL,
    `ruleId` VARCHAR(64) NULL,
    `vehicleId` VARCHAR(64) NOT NULL,
    `incidentId` VARCHAR(64) NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `triggerValue` DOUBLE NOT NULL,
    `thresholdValue` DOUBLE NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `acknowledgedBy` VARCHAR(64) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(64) NULL,
    `resolutionNote` VARCHAR(255) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `alerts_vehicleId_status_idx`(`vehicleId`, `status`),
    INDEX `alerts_status_severity_idx`(`status`, `severity`),
    INDEX `alerts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert_events` (
    `id` VARCHAR(64) NOT NULL,
    `alertId` VARCHAR(64) NOT NULL,
    `vehicleId` VARCHAR(64) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL,
    `value` DOUBLE NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `metadata` JSON NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alert_events_alertId_idx`(`alertId`),
    INDEX `alert_events_vehicleId_triggeredAt_idx`(`vehicleId`, `triggeredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `description` TEXT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'HIGH',
    `status` ENUM('ACTIVE', 'MITIGATED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    `assignedTo` VARCHAR(64) NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `incidents_status_severity_idx`(`status`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `incidents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `alerts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
