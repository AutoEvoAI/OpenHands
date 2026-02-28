import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import FileCheckIcon from "#/icons/file-check.svg?react";
import { Typography } from "#/ui/typography";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { useConversationStore } from "#/stores/conversation-store";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";

export type SpecWorkflowStage =
  | "initializing"
  | "spec_generating"
  | "spec_completed"
  | "planning"
  | "planning_completed"
  | "executing"
  | "completed"
  | "error";

interface SpecAgentPanelProps {
  currentStage?: SpecWorkflowStage;
  errorMessage?: string | null;
}

const SPEC_WORKFLOW_STAGES: { stage: SpecWorkflowStage; labelKey: string }[] = [
  { stage: "initializing", labelKey: "SPEC_AGENT$STAGE_INITIALIZING" },
  { stage: "spec_generating", labelKey: "SPEC_AGENT$STAGE_SPEC_GENERATING" },
  { stage: "spec_completed", labelKey: "SPEC_AGENT$STAGE_SPEC_COMPLETED" },
  { stage: "planning", labelKey: "SPEC_AGENT$STAGE_PLANNING" },
  {
    stage: "planning_completed",
    labelKey: "SPEC_AGENT$STAGE_PLANNING_COMPLETED",
  },
  { stage: "executing", labelKey: "SPEC_AGENT$STAGE_EXECUTING" },
  { stage: "completed", labelKey: "SPEC_AGENT$STAGE_COMPLETED" },
  { stage: "error", labelKey: "SPEC_AGENT$STAGE_ERROR" },
];

function getStageProgress(stage: SpecWorkflowStage): SpecWorkflowStage[] {
  const stageOrder: SpecWorkflowStage[] = [
    "initializing",
    "spec_generating",
    "spec_completed",
    "planning",
    "planning_completed",
    "executing",
    "completed",
  ];

  const currentIndex = stageOrder.indexOf(stage);
  if (currentIndex === -1) {
    if (stage === "error") {
      return stageOrder.slice(0, 1);
    }
    return [];
  }

  return stageOrder.slice(0, currentIndex + 1);
}

function isStageCompleted(
  stage: SpecWorkflowStage,
  currentStage: SpecWorkflowStage,
): boolean {
  const progress = getStageProgress(currentStage);
  return progress.includes(stage) && stage !== currentStage;
}

function isStageActive(
  stage: SpecWorkflowStage,
  currentStage: SpecWorkflowStage,
): boolean {
  return stage === currentStage;
}

function isStagePending(
  stage: SpecWorkflowStage,
  currentStage: SpecWorkflowStage,
): boolean {
  const progress = getStageProgress(currentStage);
  return !progress.includes(stage);
}

/* eslint-disable i18next/no-literal-string */
export function SpecAgentPanel({
  currentStage = "initializing",
  errorMessage,
}: SpecAgentPanelProps) {
  const { t } = useTranslation();
  const { conversationMode } = useConversationStore();
  const { curAgentState } = useAgentState();

  const isAgentRunning =
    curAgentState === AgentState.RUNNING ||
    curAgentState === AgentState.LOADING;

  const isInSpecMode = conversationMode === "spec";

  if (!isInSpecMode) {
    return null;
  }

  const isCompleted = currentStage === "completed";
  const isError = currentStage === "error";

  const renderStageIcon = (stageInfo: { stage: SpecWorkflowStage }) => {
    const isStageComplete = isStageCompleted(stageInfo.stage, currentStage);
    const stageIsActive = isStageActive(stageInfo.stage, currentStage);

    if (isStageComplete || currentStage === "completed") {
      return (
        <CheckCircle
          className={cn("text-green-500", isStageComplete && "opacity-100")}
          size={18}
        />
      );
    }

    if (stageIsActive) {
      return <Loader2 className="text-[#597FF4] animate-spin" size={18} />;
    }

    return <Circle className="text-[#525252]" size={18} />;
  };

  return (
    <div className="bg-[#25272d] border border-[#597FF4] rounded-[12px] w-full mt-2">
      {/* Header */}
      <div className="border-b border-[#525252] flex h-[41px] items-center px-2 gap-2">
        <FileCheckIcon width={18} height={18} color="#9299aa" />
        <Typography.Text className="font-medium text-[11px] text-white tracking-[0.11px] leading-4">
          {t(I18nKey.COMMON$SPEC)}
        </Typography.Text>
        <div className="flex-1" />
        {isAgentRunning && (
          <div className="flex items-center gap-1">
            <Loader2 className="text-white animate-spin" size={14} />
            <Typography.Text className="font-medium text-[11px] text-white tracking-[0.11px] leading-4">
              {t(I18nKey.COMMON$WORKING)}
            </Typography.Text>
          </div>
        )}
        {isCompleted && <CheckCircle className="text-green-500" size={14} />}
      </div>

      {/* Workflow Stages */}
      <div className="flex flex-col gap-0">
        {SPEC_WORKFLOW_STAGES.filter((s) => s.stage !== "error").map(
          (stageInfo, index) => {
            const isCompletedStage = isStageCompleted(
              stageInfo.stage,
              currentStage,
            );
            const isActiveStage = isStageActive(stageInfo.stage, currentStage);
            const isPendingStage = isStagePending(
              stageInfo.stage,
              currentStage,
            );

            return (
              <div
                key={stageInfo.stage}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  index !== SPEC_WORKFLOW_STAGES.length - 2 &&
                    "border-b border-[#525252]",
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {renderStageIcon(stageInfo)}
                </div>

                {/* Stage Label */}
                <Typography.Text
                  className={cn(
                    "font-medium text-[13px] leading-5",
                    isCompletedStage && "text-green-500",
                    isActiveStage && "text-white",
                    isPendingStage && "text-[#9299aa]",
                  )}
                >
                  {t(stageInfo.labelKey as I18nKey)}
                </Typography.Text>

                {/* Active indicator */}
                {isActiveStage && isAgentRunning && (
                  <div className="flex-1">
                    <div className="h-[2px] bg-[#597FF4] rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {/* Error Message */}
      {isError && errorMessage && (
        <div className="border-t border-[#525252] p-4 bg-red-500/10">
          <Typography.Text className="text-red-400 text-[13px]">
            {errorMessage}
          </Typography.Text>
        </div>
      )}
    </div>
  );
}
