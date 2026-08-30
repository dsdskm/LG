import { RobotDomain } from "./robot-domain";

type PropertySchemeObject = {
    [key: string]: unknown;
};

export enum TaskStatus {
    ACTIVE = "ACTIVE",
    DEACTIVATED = "DEACTIVATED",
    INACTIVE = "INACTIVE",
}

export enum TaskType {
    CONTROL = "CONTROL",
    ACTION = "ACTION",
    ROOT = "ROOT"
}

export interface Task {
    id: number;
    groupId: string | null;
    siteId: string | null;
    taskType: string;
    robotDomains: RobotDomain[]
    name: string;
    propertyScheme: PropertySchemeObject;
    minExecVer: string
    version: number;
    versionMajor: number;
    versionPatch: number;
    description: string;
    isDeployable: boolean;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;

}