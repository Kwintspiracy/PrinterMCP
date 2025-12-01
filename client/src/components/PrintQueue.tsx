import { Box, Heading, Text, VStack, HStack, Button, Badge, Card, CardBody, useColorModeValue, Icon, Flex } from '@chakra-ui/react';
import { FiFileText, FiInbox } from 'react-icons/fi';

interface PrintQueueProps {
  queue?: { length: number; jobs: Array<{ id: string; document: string; pages: number }> };
  onCancelJob: (jobId: string) => void;
}

export default function PrintQueue({ queue, onCancelJob }: PrintQueueProps) {
  const jobBg = useColorModeValue('gray.50', 'gray.700');
  const emptyColor = useColorModeValue('gray.400', 'gray.500');

  return (
    <Card>
      <CardBody>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md" fontWeight="600" letterSpacing="-0.5px">
            Print Queue
          </Heading>
          <Badge
            colorScheme={queue?.length ? 'blue' : 'gray'}
            variant="subtle"
            fontSize="xs"
            px={3}
            py={1}
            borderRadius="full"
          >
            {queue?.length || 0} {queue?.length === 1 ? 'job' : 'jobs'}
          </Badge>
        </Flex>

        <VStack spacing={3} maxH="300px" overflowY="auto" align="stretch">
          {queue?.jobs.length === 0 && (
            <VStack py={8} spacing={3}>
              <Icon as={FiInbox} boxSize={12} color={emptyColor} />
              <Text color={emptyColor} fontWeight="500">No jobs in queue</Text>
            </VStack>
          )}
          {queue?.jobs.map((job) => (
            <HStack
              key={job.id}
              w="full"
              justify="space-between"
              p={4}
              bg={jobBg}
              borderRadius="lg"
              transition="all 0.2s"
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'md',
              }}
              role="listitem"
            >
              <HStack spacing={3}>
                <Icon as={FiFileText} boxSize={5} color="brand.500" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="600" fontSize="sm">{job.document}</Text>
                  <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                    {job.pages} {job.pages === 1 ? 'page' : 'pages'}
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => onCancelJob(job.id)}
                aria-label={`Cancel print job ${job.document}`}
              >
                Cancel
              </Button>
            </HStack>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
}
