import Swal from 'sweetalert2';

const baseOptions = {
  buttonsStyling: false,
  customClass: {
    popup: 'rounded-2xl',
    title: 'text-slate-900 font-bold',
    htmlContainer: 'text-slate-600',
    confirmButton:
      'inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none',
    cancelButton:
      'ml-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none',
  },
  reverseButtons: true,
};

export const showAlert = (options = {}) => {
  return Swal.fire({
    ...baseOptions,
    confirmButtonText: 'OK',
    ...options,
  });
};

export const showSuccessAlert = (title, text, options = {}) => {
  return Swal.fire({
    ...baseOptions,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#4f46e5',
    ...options,
  });
};

export const showErrorAlert = (title, text, options = {}) => {
  return Swal.fire({
    ...baseOptions,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc2626',
    ...options,
  });
};

export const showConfirmDialog = (options = {}) => {
  return Swal.fire({
    ...baseOptions,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#64748b',
    ...options,
  });
};

export const showDangerConfirmDialog = (options = {}) => {
  return Swal.fire({
    ...baseOptions,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Continue',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    ...options,
  });
};

export const showPromptDialog = (options = {}) => {
  return Swal.fire({
    ...baseOptions,
    input: 'textarea',
    inputAttributes: {
      autocapitalize: 'off',
    },
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#64748b',
    ...options,
  });
};

export default Swal;