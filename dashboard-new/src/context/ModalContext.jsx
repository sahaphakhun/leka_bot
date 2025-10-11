import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  // Modal states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isSubmitTaskOpen, setIsSubmitTaskOpen] = useState(false);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isMemberActionsOpen, setIsMemberActionsOpen] = useState(false);
  const [isRecurringTaskOpen, setIsRecurringTaskOpen] = useState(false);
  const [isRecurringHistoryOpen, setIsRecurringHistoryOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Modal data
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRecurring, setSelectedRecurring] = useState(null);
  const [confirmDialogData, setConfirmDialogData] = useState(null);

  // Add Task Modal
  const openAddTask = (defaultTab = 'normal') => {
    setSelectedTask({ defaultTab });
    setIsAddTaskOpen(true);
  };

  const closeAddTask = () => {
    setIsAddTaskOpen(false);
    setSelectedTask(null);
  };

  // Edit Task Modal
  const openEditTask = (task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const closeEditTask = () => {
    setIsEditTaskOpen(false);
    setSelectedTask(null);
  };

  // Task Detail Modal
  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const closeTaskDetail = () => {
    setIsTaskDetailOpen(false);
    setSelectedTask(null);
  };

  // Submit Task Modal
  const openSubmitTask = (task) => {
    setSelectedTask(task);
    setIsSubmitTaskOpen(true);
  };

  const closeSubmitTask = () => {
    setIsSubmitTaskOpen(false);
    setSelectedTask(null);
  };

  // File Preview Modal
  const openFilePreview = (file) => {
    setSelectedFile(file);
    setIsFilePreviewOpen(true);
  };

  const closeFilePreview = () => {
    setIsFilePreviewOpen(false);
    setSelectedFile(null);
  };

  // Invite Member Modal
  const openInviteMember = () => {
    setIsInviteMemberOpen(true);
  };

  const closeInviteMember = () => {
    setIsInviteMemberOpen(false);
  };

  // Member Actions Modal
  const openMemberActions = (member) => {
    setSelectedMember(member);
    setIsMemberActionsOpen(true);
  };

  const closeMemberActions = () => {
    setIsMemberActionsOpen(false);
    setSelectedMember(null);
  };

  // Recurring Task Modal
  const openRecurringTask = (recurring = null) => {
    setSelectedRecurring(recurring);
    setIsRecurringTaskOpen(true);
  };

  const closeRecurringTask = () => {
    setIsRecurringTaskOpen(false);
    setSelectedRecurring(null);
  };

  // Recurring History Modal
  const openRecurringHistory = (recurring) => {
    setSelectedRecurring(recurring);
    setIsRecurringHistoryOpen(true);
  };

  const closeRecurringHistory = () => {
    setIsRecurringHistoryOpen(false);
    setSelectedRecurring(null);
  };

  // Confirm Dialog
  const openConfirmDialog = (data) => {
    setConfirmDialogData(data);
    setIsConfirmDialogOpen(true);
  };

  const closeConfirmDialog = () => {
    setIsConfirmDialogOpen(false);
    setConfirmDialogData(null);
  };

  // Close all modals
  const closeAllModals = () => {
    setIsAddTaskOpen(false);
    setIsEditTaskOpen(false);
    setIsTaskDetailOpen(false);
    setIsSubmitTaskOpen(false);
    setIsFilePreviewOpen(false);
    setIsInviteMemberOpen(false);
    setIsMemberActionsOpen(false);
    setIsRecurringTaskOpen(false);
    setIsRecurringHistoryOpen(false);
    setIsConfirmDialogOpen(false);
    setSelectedTask(null);
    setSelectedFile(null);
    setSelectedMember(null);
    setSelectedRecurring(null);
    setConfirmDialogData(null);
  };

  const value = {
    // States
    isAddTaskOpen,
    isEditTaskOpen,
    isTaskDetailOpen,
    isSubmitTaskOpen,
    isFilePreviewOpen,
    isInviteMemberOpen,
    isMemberActionsOpen,
    isRecurringTaskOpen,
    isRecurringHistoryOpen,
    isConfirmDialogOpen,

    // Data
    selectedTask,
    selectedFile,
    selectedMember,
    selectedRecurring,
    confirmDialogData,

    // Actions
    openAddTask,
    closeAddTask,
    openEditTask,
    closeEditTask,
    openTaskDetail,
    closeTaskDetail,
    openSubmitTask,
    closeSubmitTask,
    openFilePreview,
    closeFilePreview,
    openInviteMember,
    closeInviteMember,
    openMemberActions,
    closeMemberActions,
    openRecurringTask,
    closeRecurringTask,
    openRecurringHistory,
    closeRecurringHistory,
    openConfirmDialog,
    closeConfirmDialog,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export default ModalContext;

