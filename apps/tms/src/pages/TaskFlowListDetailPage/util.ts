import type { TFunction } from "i18next";

export type PendingAction = "activate" | "deactivate" | "delete" | null;
export type SubmitState = "activate" | "deactivate" | "delete" | null;

export function getConfirmDialogContent(
    action: PendingAction,
    taskFlowName: string,
    isSubmitting: SubmitState,
    t: TFunction,
) {
    if (action === "activate") {
        return {
            title: t("detail.confirm.activateTitle"),
            description: t("detail.confirm.activateDesc", { name: taskFlowName }),
            confirmText: isSubmitting === "activate" ? t("detail.confirm.activating") : t("detail.confirm.activate"),
        };
    }

    if (action === "deactivate") {
        return {
            title: t("detail.confirm.deactivateTitle"),
            description: t("detail.confirm.deactivateDesc", { name: taskFlowName }),
            confirmText: isSubmitting === "deactivate" ? t("detail.confirm.deactivating") : t("detail.confirm.deactivate"),
        };
    }

    if (action === "delete") {
        return {
            title: t("detail.confirm.deleteTitle"),
            description: t("detail.confirm.deleteDesc", { name: taskFlowName }),
            confirmText: isSubmitting === "delete" ? t("detail.confirm.deleting") : t("actions.delete"),
        };
    }

    return {
        title: "",
        description: "",
        confirmText: t("common:confirm"),
    };
}

export function getSuccessDialogContent(
    action: Exclude<PendingAction, null>,
    taskFlowName: string,
    t: TFunction,
) {
    if (action === "activate") {
        return {
            title: t("detail.success.activateTitle"),
            message: t("detail.success.activateMsg", { name: taskFlowName }),
        };
    }

    if (action === "deactivate") {
        return {
            title: t("detail.success.deactivateTitle"),
            message: t("detail.success.deactivateMsg", { name: taskFlowName }),
        };
    }

    return {
        title: t("detail.success.deleteTitle"),
        message: t("detail.success.deleteMsg", { name: taskFlowName }),
    };
}

export function getErrorDialogTitle(action: PendingAction, t: TFunction) {
    if (action === "activate") return t("detail.error.activateFail");
    if (action === "deactivate") return t("detail.error.deactivateFail");
    if (action === "delete") return t("detail.error.deleteFail");
    return t("detail.error.processFail");
}