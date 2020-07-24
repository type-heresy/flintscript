;;;###autoload
(define-derived-mode flint-mode prog-mode "Flint"
  "Major mode for editing flint"
  (flint-font-lock-setup))

(defun flint-font-lock-setup ()
  (setq font-lock-defaults
        '((
           ("[(].*?[)]" . font-lock-comment-face)
           ("\\]\\|\\[\\|;\\|:define\\|:syntax" . font-lock-keyword-face)
           ("\\\\.*$" . font-lock-comment-face)
           ("[\"].*[\"]" . font-lock-string-face)))))


(provide 'flint-mode)
