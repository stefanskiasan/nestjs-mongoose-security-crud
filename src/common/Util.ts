/**
 * Wrapper for various utility functions and annotations.
 */
export class Util {
    private static readonly ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

    /**
     * Function.
     * Generates a random ID of a given length.
     *
     * @param length Length of the ID to generate.
     * @returns ID of length "length"
     */
    public static makeId(length: any = 32): string {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;

        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        return result;
    }

    /**
     * Decorator.
     * Adds a debounce via timer to any given function/method.
     * Note: The function returns a Promise<any> instead of the original return type if preserveReturnValue is set to true.
     * If preserveReturnValue is not set, the return value of the function will be trucated.
     *
     * @param timeoutInMs Debounce timeout.
     * @param preserveReturnValue Decides whether the function may still return a value. Default: false.
     */
    public static debounce(timeoutInMs: number, preserveReturnValue = false) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalFunc = target[propertyKey];
            // @ts-ignore
            let timer = null;

            if (preserveReturnValue === true) { // return value provided as promise
                descriptor.value = function (...args: any[]): Promise<any> {
                    return new Promise<any>((res) => {
                        // @ts-ignore
                        if (timer) {
                            // @ts-ignore
                            clearTimeout(timer);
                        }

                        timer = setTimeout(() => {
                            const originalFuncBound = originalFunc.bind(this);
                            res(originalFuncBound(...args));
                        }, timeoutInMs);
                    });
                };
            } else { // no return value provided
                descriptor.value = function (...args: any[]): void {
                    // @ts-ignore
                    if (timer) {
                        // @ts-ignore
                        clearTimeout(timer);
                    }

                    timer = setTimeout(() => {
                        const originalFuncBound = originalFunc.bind(this);
                        originalFuncBound(...args);
                    }, timeoutInMs);
                };

            }
        };
    }

    /**
     * Function.
     * Replaces all ISO 8601 date strings within the object by date objects.
     *
     * @param target Object or array of objects.
     * @returns The object (target).
     */
    public static replaceIso8601StringsWithDates(target: object | object[]): object | object[] {
        if (target !== null && typeof (target) === 'object') {
            if (Array.isArray(target)) {
                for (const arrayElement of target) {
                    Util.replaceIso8601StringsWithDates(arrayElement);
                }
            } else {
                for (const prop in target) {
                    // @ts-ignore
                    if (Util.isIso8601String(target[prop])) {
                        // @ts-ignore
                        target[prop] = new Date(target[prop]);
                    } else {
                        // @ts-ignore
                        Util.replaceIso8601StringsWithDates(target[prop]);
                    }
                }
            }
        }

        return target;
    }

    /**
     * Function.
     * Checks if a given string has the ISO 8601 date format.
     *
     * @param str String to check.
     * @returns True: str is IOS 8601 string; False: otherwise.
     */
    public static isIso8601String(str: string): boolean {
        return typeof (str) === 'string' && Util.ISO8601_REGEX.test(str);
    }

    /**
     * Function.
     * Checks if a given object is null or empty ({}).
     *
     * @param obj Object to check.
     * @returns True: Object ist null or empty; False: otherwise.
     */
    public static isEmptyObject(obj: object): boolean {
        if (obj === null || obj === undefined) {
            return true;
        }

        for (const prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                return false;
            }
        }

        return JSON.stringify(obj) === JSON.stringify({});
    }

    /**
     * Function.
     * Counts the number of keys in an object.
     *
     * @param target Object to count the keys for.
     * @returns Number of keys within the object.
     */
    public static getKeyCountInObject(target: object): number {
        if (target === null || target === undefined) {
            return 0;
        }

        return Object.keys(target).length;
    }

    /**
     * Function.
     * Builds a standard regular expression from a filter expression
     * that searches for every string that contains the given string ignoring case.
     *
     * @param filterExpression the expression to search for
     * @returns the resulting regular expression
     */
    public static defaultSearchRegExp(filterExpression: string): any {
        return { $regex: '.*' + filterExpression + '.*', $options: 'i' };
    }
    // @ts-ignore
    public static initializeValidityComputation(valueChanges) {
        let newestValidFrom: Date;
        for (const validity of valueChanges) {
            // @ts-ignore
            if (Util.isEmptyObject(newestValidFrom) || newestValidFrom < validity.validFrom) {
                newestValidFrom = validity.validFrom;
            }
        }
        // @ts-ignore
        const dayBeforeNewestValidFrom = new Date(newestValidFrom.getTime());
        // @ts-ignore
        dayBeforeNewestValidFrom.setDate(newestValidFrom.getDate() - 1);
        for (const validity of valueChanges) {
            // @ts-ignore
            if (Util.isEmptyObject(validity.validTo) && validity.validFrom !== newestValidFrom) {
                validity.validTo = dayBeforeNewestValidFrom;
            }
        }
    }
    // @ts-ignore
    public static sortValidities(fieldName: string, reactiveForm) {
        const validities = reactiveForm.get(fieldName).value;
        // @ts-ignore
        validities.sort(function (validity1, validity2) {
            return validity2.validFrom - validity1.validFrom;
        });

        reactiveForm.get(fieldName).patchValue(validities, { emitEvent: false });
    }

    /**
     * Function.
     * Does precise Multiplication of factor1 and factor2
     *
     * @param factor1 number to be multiplied
     * @param factor2 number to be multiplied
     * @returns the resulting precise number of multiplication
     */
    public static preciseMultiplication(factor1: number, factor2: number) {
        let product = Number(factor1 * 100) * Number(factor2 * 100);
        product = Math.round(product) / 10000;
        return product;
    }

    /**
     * Function.
     * Does precise Addition of Number List
     *
     * @param valuesToSum Numbers to be added
     * @returns the result of the Addition
     */
    public static sumUpValues(valuesToSum: number[]) {
        let sumOfCosts = Number(0);
        for (const value of valuesToSum) {
            sumOfCosts = sumOfCosts + Number(value * 100);
        }
        return Math.round(sumOfCosts) / 100;

    }
    // @ts-ignore
    public static roundTime(date, duration, method) {
        // @ts-ignore
        return moment(Math[method]((+date) / (+duration)) * (+duration));
    }


    public static systemUserId() {
        return '0000000000000000';
    }

    /**
     * Creates an array of Dates between given startDate and endDate
     * @param startDate will be included in the array
     * @param endDate will be included in the array
     */
    public static getDaysArray(startDate: Date, endDate: Date): Date[] {
        const arr = [];
        for(const dt=new Date(startDate); dt<=endDate; dt.setDate(dt.getDate()+1)){
            arr.push(new Date(dt));
        }
        return arr;
    }

}


export class EnumJSONGenerator  {
    static toJSON() {
        const jsonArray = [];
        const tempObj = this;
        for (const key in tempObj) {
            // @ts-ignore
            if (typeof tempObj[key] !== 'function') {
                const temp = {};
                // @ts-ignore
                temp['_id'] = key;
                // @ts-ignore
                temp['value'] = tempObj[key];
                jsonArray.push(temp);
            }
        }
        return jsonArray;
    }
}
