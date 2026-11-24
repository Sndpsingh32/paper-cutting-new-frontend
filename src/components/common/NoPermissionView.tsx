import { Link } from 'react-router';

type Props = {
  title?: string;
  message?: string;
};

const NoPermissionView = ({
  title = 'Access restricted',
  message = 'You do not have permission to view this page. Contact your administrator.',
}: Props) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
    <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <Link
        to="/profile"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Go to Profile
      </Link>
    </div>
  </div>
);

export default NoPermissionView;
