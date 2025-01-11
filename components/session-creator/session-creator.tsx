'use client';

import { createConsensusSessionAndUserGroupAction } from '@/app/actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FunButton from '@/components/ui/fun-button';
import { Card, CardBody, Text, Heading, Input } from '@chakra-ui/react';
import { SubmitHandler, useForm } from "react-hook-form";

type SessionCreatorProps = {
  groupAddresses: string[];
};

type SessionCreatorInputs = {
  groupnumber: number;
};

export function SessionCreator({ groupAddresses }: SessionCreatorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<SessionCreatorInputs>();

  const onSubmit: SubmitHandler<SessionCreatorInputs> = (formProps) => {
    const groupLabel = formProps.groupnumber;
    setIsLoading(true);
    createConsensusSessionAndUserGroupAction(groupAddresses, groupLabel)
      .then((resp) => {
        if (typeof resp === 'number') {
          toast.success('Session Created!');
          router.push(`/play/${resp}`);
        }
      })
      .catch(() => toast.error('Oops! An error occured, please try again!'));
    setIsLoading(false);
  }

  return (
    <Card
      direction={{ base: 'column', sm: 'row' }}
      overflow="hidden"
      variant="outline"
    >
      <CardBody>
        <Heading size="md">Create Your Group</Heading>
        <Text py="2">
          Label your group with the name of the room you're in and select 3+
          people to get started.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="w-[250px]">
            <Input
              errorBorderColor={'crimson'}
              sx={{
                borderColor: !isValid ? 'crimson' : 'inherit',
                borderWidth: !isValid ? '2px' : '1px'
              }}
              placeholder={'Enter Group Number Here'}
              {...register('groupnumber', {
                required: 'Group number is required',
                min: { value: 1, message: 'Group number must be at least 1' },
                max: {
                  value: 200,
                  message: 'Group number must be less than or equal to 200'
                }
              })}
            />
            {errors.groupnumber && <span>{errors.groupnumber.message}</span>}
          </div>
          <FunButton
            disabled={!isValid || groupAddresses?.length <= 2}
            formAction={'submit'}
          >
            Create Session ({groupAddresses?.length || 0})
          </FunButton>
        </form>
      </CardBody>
    </Card>
  );
}
