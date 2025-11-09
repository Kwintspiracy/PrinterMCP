import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { Statistics } from '../api';

interface StatsPanelProps {
  stats: Statistics | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">Statistics</Heading>
      <SimpleGrid columns={2} spacing={4}>
        <Stat>
          <StatLabel>Total Pages</StatLabel>
          <StatNumber color="brand.500">{stats?.totalPagesPrinted || 0}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Success Rate</StatLabel>
          <StatNumber color="brand.500">{stats?.successRate || 0}%</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Completed Jobs</StatLabel>
          <StatNumber color="brand.500">{stats?.completedJobs || 0}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Failed Jobs</StatLabel>
          <StatNumber color="brand.500">{stats?.failedJobs || 0}</StatNumber>
        </Stat>
      </SimpleGrid>
    </Box>
  );
}
