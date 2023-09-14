import { isValid, parse, format } from 'date-fns';
import { FindOptionsWhere, Raw } from 'typeorm';
import { formats } from '../constants/formats';
import { Transaction } from '../entity/Transaction';

export const buildPeriodFilterString = (dtFrom?: string, dtEnd?: string) => {
  let result: FindOptionsWhere<Transaction>['dt'];

  if (dtFrom && !dtEnd) {
    if (isValid(parse(dtFrom, formats.date.short, new Date()))) {
      result = Raw((alias) => `${alias} >= :dtFrom`, { dtFrom: dtFrom });
    } else {
      const errMessage = 'buildPeriodFilterString invalid dtFrom ' + dtFrom;
      console.error(errMessage);
      throw new Error(errMessage);
    }
  }

  if (!dtFrom && dtEnd) {
    if (isValid(parse(dtEnd, formats.date.short, new Date()))) {
      const dtEndValue = parse(dtEnd, formats.date.short, new Date());
      dtEndValue.setDate(dtEndValue.getDate() + 1);
      const dtEndToFilter = format(dtEndValue, formats.date.short);

      result = Raw((alias) => `${alias} <= :dtEnd`, { dtEnd: dtEndToFilter });
    } else {
      const errMessage = 'buildPeriodFilterString invalid dtEnd ' + dtEnd;
      console.error(errMessage);
      throw new Error(errMessage);
    }
  }

  if (dtFrom && dtEnd) {
    if (isValid(parse(dtFrom, formats.date.short, new Date())) && isValid(parse(dtEnd, formats.date.short, new Date()))) {
      const dtEndValue = parse(dtEnd, formats.date.short, new Date());
      dtEndValue.setDate(dtEndValue.getDate() + 1);
      const dtEndToFilter = format(dtEndValue, formats.date.short);

      result = Raw((alias) => `${alias} >= :dtFrom AND ${alias} <= :dtEnd`, { dtFrom: dtFrom, dtEnd: dtEndToFilter });
    } else {
      const errMessage = 'buildPeriodFilterString invalid dtFrom or dtEnd ' + dtFrom + ' ' + dtEnd;
      console.error(errMessage);
      throw new Error(errMessage);
    }
  }

  return result;
};

export const getMonthPeriods = (dtFrom: string, dtEnd: string) => {
  const res: string[] = [];
  if (isValid(parse(dtFrom, formats.date.short, new Date())) && isValid(parse(dtEnd, formats.date.short, new Date()))) {
    const dateFrom = parse(dtFrom, formats.date.short, new Date());
    const dateEnd = parse(dtEnd, formats.date.short, new Date());
    for (let year = dateFrom.getFullYear(); year <= dateEnd.getFullYear(); year++) {
      const initMonth = year === dateFrom.getFullYear() ? dateFrom.getMonth() : 0;
      const lastMonth = year === dateEnd.getFullYear() ? dateEnd.getMonth() : 11;
      for (let month = initMonth; month <= lastMonth; month++) {
        const formattedMonth = String(month + 1).padStart(2, '0');
        res.push(`${year}_${formattedMonth}`);
      }
    }
    return res;
  } else {
    const errMessage = 'getMonthPeriods invalid dtFrom or dtEnd ' + dtFrom + ' ' + dtEnd;
    console.error(errMessage);
    throw new Error(errMessage);
  }
};
