// tutta questa gestione dovrà essere migliorata e sistemata con l'aggiunta delle nuove famiglie

export function getRequiredConnector4Family(
    obj1: { code: string; family: string, system: string },
    obj2: { code: string; family: string, system: string }
): string | null {

    console.log(obj1.system);
    console.log(obj2.system);

    const isProfile1 = obj1.family.includes("Profili");
    const isProfile2 = obj2.family.includes("Profili");

    if (!isProfile1 || !isProfile2) {
        return null;
    }

    if (obj1.family !== obj2.family || obj1.system !== obj2.system) {
        return null;
    }

    if (obj1.system === "XNet" && obj2.system === "XNet") return getRequiredConnectorXnet(obj1, obj2);
    if (obj1.system === "XFree S" && obj2.system === "XFree S") return "FES35CK";

    return null;
}

export function getRequiredConnectorXnet(
    obj1: { code: string; family: string },
    obj2: { code: string; family: string }
): string | null {

    const baseCode1 = obj1.code.split(' ')[0].split('+')[0];
    const baseCode2 = obj2.code.split(' ')[0].split('+')[0];

    const isCurved1 = baseCode1.endsWith('C');
    const isCurved2 = baseCode2.endsWith('C');

    if (!isCurved1 && !isCurved2) {
        return 'XNRS02LC';
    } else {
        return 'XNRS01LC';
    }
}