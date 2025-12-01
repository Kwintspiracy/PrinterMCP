import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, Card, CardBody, useColorModeValue, Icon, VStack } from '@chakra-ui/react';
import { FiFileText, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi';
import { Statistics } from '../api';

interface StatsPanelProps {
  stats: Statistics | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const statBg = useColorModeValue('gray.50', 'gray.700');

  const statCards = [
    {
      label: 'Total Pages',
      value: stats?.totalPagesPrinted || 0,
      icon: FiFileText,
      color: 'blue.500'
    },
    {
      label: 'Success Rate',
      value: `${stats?.successRate || 0}%`,
      icon: FiTrendingUp,
      color: 'green.500'
    },
    {
      label: 'Completed Jobs',
      value: stats?.completedJobs || 0,
      icon: FiCheckCircle,
      color: 'blue.500'
    },
    {
      label: 'Failed Jobs',
      value: stats?.failedJobs || 0,
      icon: FiXCircle,
      color: 'red.500'
    },
  ];

  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Statistics
        </Heading>
        <SimpleGrid columns={{ base: 2, md: 2 }} spacing={4}>
          {statCards.map((stat, index) => (
            <Box
              key={index}
              p={4}
              bg={statBg}
              borderRadius="lg"
              transition="all 0.2s"
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'md',
              }}
            >
              <VStack align="start" spacing={2}>
                <Icon as={stat.icon} boxSize={6} color={stat.color} />
                <Stat>
                  <StatLabel fontSize="xs" fontWeight="600" color={useColorModeValue('gray.600', 'gray.400')}>
                    {stat.label}
                  </StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold" color={stat.color}>
                    {stat.value}
                  </StatNumber>
                </Stat>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}
