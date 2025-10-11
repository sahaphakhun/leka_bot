import { useModal } from '../../context/ModalContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export default function ConfirmDialog() {
  const { isConfirmDialogOpen, closeConfirmDialog, confirmDialogData } = useModal();

  if (!confirmDialogData) return null;

  const {
    title = 'ยืนยันการกระทำ',
    description = 'คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?',
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    variant = 'default',
    onConfirm,
    onCancel,
  } = confirmDialogData;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeConfirmDialog();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeConfirmDialog();
  };

  return (
    <AlertDialog open={isConfirmDialogOpen} onOpenChange={closeConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

