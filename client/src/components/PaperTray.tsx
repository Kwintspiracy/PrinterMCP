import { useState } from 'react';
import { Box, Heading, VStack, HStack, Text, Button, NumberInput, NumberInputField, Select, Icon } from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';

interface PaperTrayProps {
  paper?: { count: number; capacity: number; size: string };
  onLoadPaper: (count: number, size?: string) => void;
}

export default function PaperTray({ paper, onLoadPaper }: PaperTrayProps) {
  const [count, setCount] = useState(50);
  const [size, setSize] = useState('A4');

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4} color="brand.500">
        Paper Tray
      </Heading>
      
      <VStack spacing={4}>
        <HStack justify="center" spacing={4}>
          <Icon as={MdPrint} boxSize={12} color="gray.400" />
          <VStack align="start" spacing={0}>
            <Text fontSize="3xl" fontWeight="bold" color="brand.500">
              {paper?.count || 0}
            </Text>
            <Text fontSize="sm" color="gray.600">sheets</Text>
          </VStack>
        </HStack>
        
        <Text fontSize="sm" color="gray.600">
          Capacity: {paper?.capacity || 500}
        </Text>
        
        <HStack w="full" spacing={2}>
          <NumberInput size="sm" min={1} max={500} value={count} onChange={(_, val) => setCount(val)}>
            <NumberInputField placeholder="Sheets" />
          </NumberInput>
          <Select size="sm" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
            <option value="A3">A3</option>
            <option value="4x6">4x6</option>
          </Select>
        </HStack>
        <Button w="full" colorScheme="brand" onClick={() => onLoadPaper(count, size)}>
          Load Paper
        </Button>
      </VStack>
    </Box>
  );
}
