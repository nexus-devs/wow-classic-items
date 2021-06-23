export declare interface Talent {
    id: number;
    name: string;
    tooltip: TalentTooltip[];
}

export declare interface TalentTooltip {
    label: string;
    format?: TalentTooltipFormat;
}

export declare type TalentTooltipFormat = 'Poor'|'Misc'|'alignRight';