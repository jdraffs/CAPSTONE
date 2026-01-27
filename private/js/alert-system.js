// ============================================
// GLOBAL ALERT SYSTEM
// Beautiful, reusable alerts for the entire system
// ============================================

class AlertSystem {
  constructor() {
    // Wait for DOM to be ready before creating container
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createAlertContainer();
      });
    } else {
      this.createAlertContainer();
    }
  }

  createAlertContainer() {
    // Check if alert system already exists
    if (document.querySelector('.alert-overlay')) {
      return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    overlay.id = 'globalAlertOverlay';
    
    // Create container
    const container = document.createElement('div');
    container.className = 'alert-container';
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Click outside to close (only for non-confirm alerts)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !container.classList.contains('confirm')) {
        this.close();
      }
    });
  }

  show({ type = 'info', title, message, confirmText = 'OK', cancelText = 'Cancel', showCancel = false, onConfirm = null, onCancel = null, closeButton = false }) {
    const overlay = document.getElementById('globalAlertOverlay');
    
    // If overlay doesn't exist yet, create it
    if (!overlay) {
      this.createAlertContainer();
      // Try again after a short delay
      setTimeout(() => {
        this.show({ type, title, message, confirmText, cancelText, showCancel, onConfirm, onCancel, closeButton });
      }, 100);
      return;
    }
    
    const container = overlay.querySelector('.alert-container');

    // Set alert type
    container.className = `alert-container ${type}`;

    // Icon based on type
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
      confirm: 'fa-question-circle'
    };

    const iconClass = icons[type] || icons.info;

    // Build alert HTML
    let html = `
      ${closeButton ? '<button class="alert-close" onclick="alertSystem.close()"><i class="fa fa-times"></i></button>' : ''}
      <div class="alert-icon">
        <i class="fa ${iconClass}"></i>
      </div>
      ${title ? `<h3 class="alert-title">${title}</h3>` : ''}
      ${message ? `<p class="alert-message">${message}</p>` : ''}
      <div class="alert-actions">
        ${showCancel ? `<button class="alert-btn alert-btn-secondary" id="alertCancelBtn">${cancelText}</button>` : ''}
        <button class="alert-btn alert-btn-${type === 'error' ? 'danger' : 'primary'}" id="alertConfirmBtn">${confirmText}</button>
      </div>
    `;

    container.innerHTML = html;

    // Show overlay with animation
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);

    // Handle confirm button
    const confirmBtn = document.getElementById('alertConfirmBtn');
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) {
        onConfirm();
      }
      this.close();
    });

    // Handle cancel button
    if (showCancel) {
      const cancelBtn = document.getElementById('alertCancelBtn');
      cancelBtn.addEventListener('click', () => {
        if (onCancel) {
          onCancel();
        }
        this.close();
      });
    }

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  close() {
    const overlay = document.getElementById('globalAlertOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  // Convenience methods
  success(message, title = 'Success!') {
    this.show({
      type: 'success',
      title,
      message,
      confirmText: 'Great!'
    });
  }

  error(message, title = 'Error') {
    this.show({
      type: 'error',
      title,
      message,
      confirmText: 'OK'
    });
  }

  warning(message, title = 'Warning') {
    this.show({
      type: 'warning',
      title,
      message,
      confirmText: 'Understood'
    });
  }

  info(message, title = 'Information') {
    this.show({
      type: 'info',
      title,
      message,
      confirmText: 'OK'
    });
  }

  confirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      this.show({
        type: 'confirm',
        title,
        message,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        showCancel: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // Special alert for deletions
  confirmDelete(itemName = 'this item') {
    return new Promise((resolve) => {
      this.show({
        type: 'error',
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }
}

// Initialize global alert system immediately
// This will be available for all scripts that load after this one
const alertSystem = new AlertSystem();

// Also expose it globally for debugging
window.alertSystem = alertSystem;

// Log initialization for debugging
console.log('Alert System initialized:', alertSystem);