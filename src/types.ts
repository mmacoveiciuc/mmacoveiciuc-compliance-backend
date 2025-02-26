export interface ComplianceRule {
    name: string;
    description: string;
}

export interface ComplianceIssueFix {
    name: string;
    description: string;
}

export interface ComplianceLineItem<T> {
    item: T;
    breached?: ComplianceRule[];
    fix?: ComplianceIssueFix[];
}

export interface ComplianceReport<T> {
    lineItems: ComplianceLineItem<T>[];
    passing: boolean;
}
