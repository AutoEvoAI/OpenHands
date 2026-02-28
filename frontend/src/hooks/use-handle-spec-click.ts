import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { useConversationStore } from "#/stores/conversation-store";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import {
  getConversationState,
  setConversationState,
} from "#/utils/conversation-local-storage";

/**
 * Custom hook that encapsulates the logic for handling spec-driven agent creation.
 * Returns a function that can be called to create a spec-driven conversation.
 *
 * @returns An object containing handleSpecClick function and isCreatingConversation boolean
 */
export const useHandleSpecClick = () => {
  const { t } = useTranslation();
  const {
    setConversationMode,
    setSubConversationTaskId,
    subConversationTaskId,
  } = useConversationStore();
  const { data: conversation } = useActiveConversation();
  const { mutate: createConversation, isPending: isCreatingConversation } =
    useCreateConversation();

  useEffect(() => {
    if (!conversation?.conversation_id) return;

    const storedState = getConversationState(conversation.conversation_id);
    if (storedState.subConversationTaskId && !subConversationTaskId) {
      setSubConversationTaskId(storedState.subConversationTaskId);
    }
  }, [
    conversation?.conversation_id,
    subConversationTaskId,
    setSubConversationTaskId,
  ]);

  const handleSpecClick = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      setConversationMode("spec");

      if (
        (conversation?.sub_conversation_ids &&
          conversation.sub_conversation_ids.length > 0) ||
        !conversation?.conversation_id ||
        subConversationTaskId
      ) {
        return;
      }

      createConversation(
        {
          parentConversationId: conversation.conversation_id,
          agentType: "spec",
        },
        {
          onSuccess: (data) => {
            displaySuccessToast(t(I18nKey.SPEC_AGENT$SPEC_DRIVEN_INITIALIZED));
            if (data.v1_task_id) {
              setSubConversationTaskId(data.v1_task_id);
              setConversationState(conversation.conversation_id, {
                subConversationTaskId: data.v1_task_id,
              });
            }
          },
        },
      );
    },
    [
      conversation,
      createConversation,
      setConversationMode,
      setSubConversationTaskId,
      subConversationTaskId,
      t,
    ],
  );

  return { handleSpecClick, isCreatingConversation };
};
