export type AssigneesInput = {
  assignees: AssigneeInput[];
};

export type AssigneeInput = {
  email: string;
  name: string;
  team: string;
  profile: string;
  tags: string[];
};

export type Assignee = {
  id: number;
  email: string;
  name: string;
  team: string;
  profile: string;
  func: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type FuncAssignees = {
  func: string;
  assignees: Assignee[];
  updatedAt?: Date | null;
};
