export const formats = {
  date: { short: 'yyyy-MM-dd', withTime: 'YYYY-MM-dd HH:mm', time: 'HH:mm' },
  dateMoment: { short: 'yyyy-MM-DD', withTime: 'YYYY-MM-DD HH:mm' }, //todo: пока придется поддерживать 2 формата, далее убрать зависимость от Moment переходом на другие пикеры либо https://ant.design/docs/react/replace-moment
};
