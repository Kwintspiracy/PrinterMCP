import { Box, Heading, Text, VStack, HStack, Button, Badge } from '@chakra-ui/react';

interface PrintQueueProps {
  queue?: { length: number; jobs: Array<{ id: string; document: string; pages: number }> };
  onCancelJob: (jobId: string) => void;
}

export default function PrintQueue({ queue, onCancelJob }: PrintQueueProps) {
  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">
        Print Queue
      </Heading>
      <Text mb={4}>Jobs in queue: <Badge colorScheme="blue">{queue?.length || 0}</Badge></Text>
      <VStack spacing={2} maxH="200px" overflowY="auto">
        {queue?.jobs.length === 0 && <Text color="gray.500">No jobs in queue</Text>}
        {queue?.jobs.map((job) => (
          <HStack key={job.id} w="full" justify="space-between" p={2} bg="gray.50" borderRadius="md">
            <VStack align="start" spacing={0}>
              <Text fontWeight="semibold" fontSize="sm">{job.document}</Text>
              <Text fontSize="xs" color="gray.600">{job.pages} pages</Text>
            </VStack>
            <Button size="xs" colorScheme="red" onClick={() => onCancelJob(job.id)}>
              Cancel
            </Button>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}
