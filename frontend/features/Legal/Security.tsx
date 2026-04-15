import PostWrapper from '@/shared/components/layout/PostWrapper';
import securityPolicy from '@/shared/lib/legal/securityPolicy';
import ContentLayout from '@/shared/components/layout/ContentLayout';

const SecurityPolicy = () => {
  return (
    <ContentLayout>
      <PostWrapper textContent={securityPolicy} />
    </ContentLayout>
  );
};

export default SecurityPolicy;
