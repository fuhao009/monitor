import { StatisticCard } from '@ant-design/pro-components';

interface Props {
  averageLatencyMs: number;
  packetLossRatePercent: number;
  bandwidthUsageGbps: number;
}

export function ConnectionOverviewCard(props: Props) {
  return (
    <StatisticCard
      title="连接质量概览"
      statistic={{ value: `${props.averageLatencyMs}ms`, description: '平均延迟' }}
    >
      <StatisticCard.Statistic title="丢包率" value={`${props.packetLossRatePercent}%`} />
      <StatisticCard.Statistic title="带宽使用" value={`${props.bandwidthUsageGbps} Gbps`} />
    </StatisticCard>
  );
}
