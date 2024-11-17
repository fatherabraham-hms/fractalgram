'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { updateUserProfileAction } from '@/app/actions';
import { useForm, SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';
import { RespectUser } from '@/lib/dtos/respect-user.dto';
import { usePrivy } from '@privy-io/react-auth';

type SignupInputs = {
  name: string;
  username: string;
  email: string;
  telegram: string;
};

export function Profile() {
  const router = useRouter();
  const {
    ready,
    authenticated,
    user,
  } = usePrivy();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInputs>()

  const onSubmit: SubmitHandler<SignupInputs> = (formProps) => {
    updateUserProfileAction({
      ...formProps,
      walletaddress: user?.wallet?.address
    }).then((response: Partial<RespectUser> | { message: string }) => {
      if (response && !('message' in response)) {
        router.push('/play');
        toast.success('Profile updated!');
      } else if (response && 'message' in response) {
        toast.error(response?.message);
      }
    })
    .catch((error) => {
      router.push('/error');
    });
  };
//https://v1.tailwindcss.com/components/forms
  return (
    ready && authenticated && <div>
      <form className="w-full max-w-sm" onSubmit={handleSubmit(onSubmit)}>
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor="inline-full-name">
              Name
            </label>
          </div>
          <div className="md:w-2/3">
            <Input placeholder={'Jane Doe'} {...register("name", { required: true })} />
            {errors.name && <span>This field is required</span>}
          </div>
        </div>
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor="inline-password">
              Username
            </label>
          </div>
          <div className="md:w-2/3">
            <Input placeholder={'wunderkitty'} {...register("username", { required: true })} />
            {errors.username && <span>This field is required</span>}
          </div>
        </div>
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor="inline-password">Email</label>
          </div>
          <div className="md:w-2/3">
            <Input
              placeholder={'foo@bar.com'}
              {...register("email", {
                required: true,
                pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
              })}
            />
            {errors.email && errors.email.type === "required" && <span>This field is required</span>}
            {errors.email && errors.email.type === "pattern" && <span>Invalid email address</span>}
          </div>
        </div>
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-1/3">
            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4">Telegram</label>
          </div>
          <div className="md:w-2/3">
            <Input placeholder={'wunderkitty'} {...register("telegram", { required: true })} />
            {errors.telegram && <span>This field is required</span>}
          </div>
        </div>
        <div className="md:flex md:items-center">
          <div className="md:w-1/3"></div>
          <div className="md:w-2/3">
            <Button type={'submit'}>Save Profile</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
