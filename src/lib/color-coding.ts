export function getQosColor(qos: 0 | 1 | 2): string {
  switch (qos) {
    case 0:
      return "bg-slate-100/50 dark:bg-slate-900/30"; // Light gray
    case 1:
      return "bg-blue-100/50 dark:bg-blue-900/30"; // Light blue
    case 2:
      return "bg-red-100/50 dark:bg-red-900/30"; // Light red
    default:
      return "";
  }
}

export function getQosTextColor(qos: 0 | 1 | 2): string {
  switch (qos) {
    case 0:
      return "text-slate-600 dark:text-slate-300";
    case 1:
      return "text-blue-600 dark:text-blue-300";
    case 2:
      return "text-red-600 dark:text-red-300";
    default:
      return "";
  }
}

export function getQosBadge(qos: 0 | 1 | 2): string {
  switch (qos) {
    case 0:
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case 1:
      return "bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200";
    case 2:
      return "bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200";
    default:
      return "";
  }
}
