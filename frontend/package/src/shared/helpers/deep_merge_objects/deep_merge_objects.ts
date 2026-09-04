export default function deepMergeObjects({
    firstObject,
    secondObject,
    defaultValue,
    key,
}: {
    firstObject: unknown;
    secondObject: unknown;
    defaultValue?: unknown;
    key: string;
}): unknown {
    const isClientObject = typeof firstObject === 'object' && firstObject !== null;
    const isServerObject = typeof secondObject === 'object' && secondObject !== null;

    if (isClientObject || isServerObject) {
        let valueClientFieldByKey: typeof firstObject;
        let valueServerFieldByKey: typeof secondObject;

        if (isClientObject) valueClientFieldByKey = firstObject[key as keyof typeof firstObject];
        if (isServerObject) valueServerFieldByKey = secondObject[key as keyof typeof secondObject];

        if (
            valueClientFieldByKey !== undefined &&
            valueClientFieldByKey !== null &&
            valueServerFieldByKey !== undefined &&
            valueServerFieldByKey !== null
        ) {
            const isClientFieldByKeyObject =
                typeof valueClientFieldByKey === 'object' && valueClientFieldByKey !== null;
            const isServerFieldByKeyObject =
                typeof valueServerFieldByKey === 'object' && valueServerFieldByKey !== null;
            const isDefaultValuesObject = typeof defaultValue === 'object' && defaultValue !== null;

            if (isClientFieldByKeyObject && isServerFieldByKeyObject) {
                if (Array.isArray(valueClientFieldByKey)) {
                    return valueClientFieldByKey;
                } else if (Array.isArray(valueServerFieldByKey)) {
                    return valueServerFieldByKey;
                }

                const clientKeys = Object.keys(valueClientFieldByKey);
                const serverKeys = Object.keys(valueServerFieldByKey);
                const defaultValuesKey = isDefaultValuesObject ? Object.keys(defaultValue) : [];

                const uniqKeys = new Set([...defaultValuesKey, ...clientKeys, ...serverKeys]);
                const res: { [key: string]: unknown } = {};

                uniqKeys.forEach((fieldKey) => {
                    res[fieldKey] = deepMergeObjects({
                        firstObject: valueClientFieldByKey,
                        secondObject: valueServerFieldByKey,
                        defaultValue:
                            typeof defaultValue === 'object' && defaultValue !== null && fieldKey in defaultValue
                                ? defaultValue[fieldKey as keyof typeof defaultValue]
                                : undefined,
                        key: fieldKey,
                    });
                });

                return res;
            } else {
                return valueClientFieldByKey ?? valueServerFieldByKey ?? defaultValue;
            }
        } else if (valueClientFieldByKey !== undefined && valueClientFieldByKey !== null) {
            return defaultValue
                ? deepMergeObjects({
                      firstObject: { [key]: valueClientFieldByKey },
                      secondObject: { [key]: defaultValue },
                      key,
                  })
                : valueClientFieldByKey;
        } else if (valueServerFieldByKey !== undefined && valueServerFieldByKey !== null) {
            return defaultValue
                ? deepMergeObjects({
                      firstObject: { [key]: valueServerFieldByKey },
                      secondObject: { [key]: defaultValue },
                      key,
                  })
                : valueServerFieldByKey;
        } else if (defaultValue) {
            return defaultValue;
        }
    } else if (!isClientObject && !isServerObject) {

        return firstObject ?? secondObject ?? defaultValue;
    }
}
