export type Func = {
    id: number;
    name: string;
    description?: string;
    prompt?:string;
    tags?: string[];
    assignees?: string[];
    createdAt: Date;
    updatedAt: Date;
};

export type FuncCreateInput = {
    name: string;
    description?: string;
    prompt?: string; 
    tags?: string[];
    assignees?: string[];
};
