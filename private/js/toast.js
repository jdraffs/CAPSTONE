// private/js/toast.js

(function() {
  'use strict';

  class ToastNotification {
    constructor() {
      this.container = null;
      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createContainer());
      } else {
        this.createContainer();
      }
    }

    createContainer() {
      // Create container if it doesn't exist
      if (!document.getElementById('toastContainer')) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      this.container = document.getElementById('toastContainer');
      console.log('✅ Toast system initialized');
    }

    show(options) {
      if (!this.container) {
        console.error('❌ Toast container not found');
        return null;
      }

      const {
        type = 'info',
        title = '',
        message = '',
        duration = 4000,
        closable = true
      } = options;

      // Create toast element
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;

      // Icon based on type
      const icons = {
        success: '<i class="fa fa-check-circle"></i>',
        error: '<i class="fa fa-times-circle"></i>',
        warning: '<i class="fa fa-exclamation-triangle"></i>',
        info: '<i class="fa fa-info-circle"></i>'
      };

      // Build toast HTML
      toast.innerHTML = `
        <div class="toast-icon">
          ${icons[type] || icons.info}
        </div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        ${closable ? '<button class="toast-close" aria-label="Close">&times;</button>' : ''}
      `;

      // Add to container
      this.container.appendChild(toast);

      // Close button handler
      if (closable) {
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));
      }

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => this.remove(toast), duration);
      }

      console.log(`✅ Toast shown: ${type} - ${title || message}`);
      return toast;
    }

    remove(toast) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }

    success(message, title = 'Success') {
      return this.show({ type: 'success', title, message });
    }

    error(message, title = 'Error') {
      return this.show({ type: 'error', title, message });
    }

    warning(message, title = 'Warning') {
      return this.show({ type: 'warning', title, message });
    }

    info(message, title = 'Info') {
      return this.show({ type: 'info', title, message });
    }

    clearAll() {
      if (!this.container) return;
      const toasts = this.container.querySelectorAll('.toast');
      toasts.forEach(toast => this.remove(toast));
    }
  }

  // Create global instance
  window.toast = new ToastNotification();
  console.log('✅ window.toast created');

  // Backward compatibility
  window.showToast = (message, type = 'info', title = '') => {
    if (!title) {
      title = type.charAt(0).toUpperCase() + type.slice(1);
    }
    return window.toast.show({ type, title, message });
  };

})();